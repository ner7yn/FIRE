const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const config = require("./config");
const state = require("./state/state");

const {
    initDetectors,
    generateEvents
} = require("./lib/detectors");

const {
    rebuildZones
} = require("./lib/zones");

const {
    handleAddressChange
} = require("./lib/addressChange");

const {
    client,
    connect,
    syncAll,
    writeSettings,
    writeController,
    readAllFromSlave
} = require("./lib/modbus");

const { encodeDetector, encodeZone } = require("./lib/encoder");

// --------------------------------------------------
// WEB
// --------------------------------------------------

const app = express();

const server =
    http.createServer(app);

const io =
    new Server(server);

app.use(
    express.static("public")
);

io.on(
    "connection",
    socket => {

        console.log(
            "[WEB] Client connected"
        );

        socket.emit(
            "state",
            state
        );
    }
);

// --------------------------------------------------
// UI UPDATE
// --------------------------------------------------

function broadcastState() {

    io.emit(
        "state",
        state
    );
}

// --------------------------------------------------
// PREVIOUS VALUES TRACKER
// --------------------------------------------------

const previousValues = {
    controller: { boardFault: null, powerType: null },
    zones: {},
    detectors: {}
};

// --------------------------------------------------
// CHANGE LOG
// --------------------------------------------------

function logChange(type, id, oldVal, newVal) {
    const timestamp = new Date().toISOString();
    console.log(`[CHANGE LOG] ${timestamp} | ${type} [${id}]: ${oldVal} -> ${newVal}`);
}

function logSlaveChange(type, id, oldVal, newVal) {
    const timestamp = new Date().toISOString();
    console.log(`[SLAVE CHANGE] ${timestamp} | ${type} [${id}]: ${oldVal} -> ${newVal}`);
}

// --------------------------------------------------
// SYNC ONLY CHANGED VALUES
// --------------------------------------------------

let isSyncingChanged = false;

async function syncChanged() {
    if (isSyncingChanged) {
        return;
    }
    isSyncingChanged = true;

    let hasChanges = false;

    // Controller
    if (
        state.controller.boardFault !== previousValues.controller.boardFault ||
        state.controller.powerType !== previousValues.controller.powerType
    ) {
        console.log("[MODBUS] Controller changed, syncing...");
        await writeController();
        previousValues.controller.boardFault = state.controller.boardFault;
        previousValues.controller.powerType = state.controller.powerType;
        hasChanges = true;
    }

    // Zones
    for (let zone = 1; zone <= 40; zone++) {
        const currentState = state.zones[zone]?.state || 0;
        const previousState = previousValues.zones[zone];

        if (previousState === undefined || currentState !== previousState) {
            const register = 0x0E + (zone - 1);
            const encoded = encodeZone(state.zones[zone]);

            if (previousState !== undefined) {
                logChange("ZONE", zone, previousState, currentState);
            } else {
                logChange("ZONE", zone, "INIT", currentState);
            }

            try {
                await client.writeRegister(register, encoded);
                previousValues.zones[zone] = currentState;
                hasChanges = true;
            } catch (err) {
                console.error(`[MODBUS] Ошибка записи зоны ${zone}: ${err.message}`);
            }
        }
    }

    // Detectors
    for (const [address, detector] of Object.entries(state.detectors)) {
        const currentState = detector?.state || 0;
        const previousState = previousValues.detectors[address];

        if (previousState === undefined || currentState !== previousState) {
            const register = 0x36 + (address - 1);
            const encoded = encodeDetector(detector);

            if (previousState !== undefined) {
                logChange("DETECTOR", address, previousState, currentState);
            } else {
                logChange("DETECTOR", address, "INIT", currentState);
            }

            try {
                await client.writeRegister(register, encoded);
                previousValues.detectors[address] = currentState;
                hasChanges = true;
            } catch (err) {
                console.error(`[MODBUS] Ошибка записи детектора ${address}: ${err.message}`);
            }
        }
    }

    if (!hasChanges) {
        console.log("[MODBUS] Нет изменений для отправки");
    }

    isSyncingChanged = false;
}

// --------------------------------------------------
// RANDOM CONTROLLER STATE
// --------------------------------------------------

function randomControllerUpdate() {
    const oldBoardFault = state.controller.boardFault;
    const oldPowerType = state.controller.powerType;

    const r = Math.random();

    if (r < 0.95) {
        state.controller.boardFault = 0;
    } else {
        state.controller.boardFault = 1;
    }

    state.controller.powerType = Math.random() > 0.5 ? 0 : 1;

    // Мгновенная отправка при изменении контроллера
    if (
        state.controller.boardFault !== oldBoardFault ||
        state.controller.powerType !== oldPowerType
    ) {
        syncChanged();
    }
}

// --------------------------------------------------
// MODBUS LOOP
// --------------------------------------------------

async function modbusLoop(firstRun = true) {

    try {
        console.log(client)
        if (client) {
            await handleAddressChange(client);
        } else {
            console.log("[MODBUS] Client not connected, skipping handleAddressChange");
        }

        // Читаем актуальное состояние от slave


        // Показываем изменения, которые произошли со стороны slave
        if (!firstRun) {

            await readAllFromSlave();
            if (
                state.controller.boardFault !== previousValues.controller.boardFault ||
                state.controller.powerType !== previousValues.controller.powerType
            ) {
                logSlaveChange("CONTROLLER", "boardFault", previousValues.controller.boardFault, state.controller.boardFault);
                logSlaveChange("CONTROLLER", "powerType", previousValues.controller.powerType, state.controller.powerType);
            }

            // Zones
            for (let zone = 1; zone <= 40; zone++) {
                const currentState = state.zones[zone]?.state || 0;
                const previousState = previousValues.zones[zone];

                if (previousState !== undefined && currentState !== previousState) {
                    logSlaveChange("ZONE", zone, previousState, currentState);
                }
            }

            // Detectors
            for (const [address, detector] of Object.entries(state.detectors)) {
                const currentState = detector?.state || 0;
                const previousState = previousValues.detectors[address];

                if (previousState !== undefined && currentState !== previousState) {
                    logSlaveChange("DETECTOR", address, previousState, currentState);
                }
            }
        }

        generateEvents();

        rebuildZones();



        // При первом запуске отправляем всё, потом только изменения
        if (firstRun) {
            console.log("[MODBUS] Первый запуск - отправляем все регистры...");
            await syncAll();
            randomControllerUpdate();
            // Инициализируем предыдущие значения после первой отправки
            previousValues.controller.boardFault = state.controller.boardFault;
            previousValues.controller.powerType = state.controller.powerType;

            for (let zone = 1; zone <= 40; zone++) {
                previousValues.zones[zone] = state.zones[zone]?.state || 0;
            }

            for (const [address, detector] of Object.entries(state.detectors)) {
                previousValues.detectors[address] = detector?.state || 0;
            }
        } else {
            // Фоновая синхронизация как страховка
            syncChanged();
        }

        broadcastState();

    }
    catch (err) {

        console.error(
            "[MODBUS LOOP]",
            err.message
        );

        state.statistics.connected =
            false;
    }
}

// --------------------------------------------------
// DETECTOR EVENT LOOP
// --------------------------------------------------

function startEventLoop() {

    setInterval(
        async () => {

            generateEvents();

            rebuildZones();

            // Мгновенная отправка изменений зон и детекторов
            syncChanged();

            broadcastState();
        },

        config.emulator.eventInterval
    );
}

// --------------------------------------------------
// MODBUS LOOP
// --------------------------------------------------

function startModbusLoop() {

    // Первый запуск через 5 секунд
    setTimeout(
        async () => {
            console.log('первый запуск')
            await modbusLoop(true); // firstRun = true
        },

        5000
    );

    // Последующие запуски каждые 10 секунд
    setInterval(
        async () => {
            console.log('повторный запуск')
            await modbusLoop(false); // firstRun = false
        },

        config.modbus.pollInterval
    );
}

// --------------------------------------------------
// INIT
// --------------------------------------------------

async function initialize() {

    console.log(
        "================================="
    );

    console.log(
        "Modbus Master Emulator"
    );

    console.log(
        "================================="
    );

    state.settings =
        JSON.parse(
            JSON.stringify(
                config.emulator.settings
            )
        );

    initDetectors();

    rebuildZones();

    try {

        await connect();

        await writeSettings();

        state.statistics.connected =
            true;
    }
    catch (err) {

        console.error(
            "[MODBUS]",
            err.message
        );

        state.statistics.connected =
            false;
    }
}

// --------------------------------------------------
// START
// --------------------------------------------------

async function start() {

    await initialize();

    server.listen(
        config.web.port,

        () => {

            console.log(
                `[WEB] http://localhost:${config.web.port}`
            );
        }
    );

    // startEventLoop();

    startModbusLoop();

    broadcastState();

    console.log(
        "[SYSTEM] Started"
    );
}

start().catch(
    console.error
);