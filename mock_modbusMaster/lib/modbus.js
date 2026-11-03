const ModbusRTU = require("modbus-serial");

const config = require("../config");
const state = require("../state/state");

const {
    encodeDetector,
    encodeZone,
    decodeDetector,
    decodeZone
} = require("./encoder");

const client = new ModbusRTU();

async function connect() {

    await client.connectRTUBuffered(
        config.modbus.port,
        {
            baudRate:
                config.modbus.baudRate,

            dataBits:
                config.modbus.dataBits,

            stopBits:
                config.modbus.stopBits,

            parity:
                config.modbus.parity
        }
    );

    client.setID(
        config.modbus.slaveId
    );

    state.statistics.connected =
        true;

    console.log(
        `[MODBUS] Connected ${config.modbus.port}`
    );
}

async function writeSettings() {

    for (
        const [register, value]
        of Object.entries(
            config.emulator.settings
        )
    ) {

        await client.writeRegister(
            Number(register) - 1,
            value
        );
    }
}

async function writeController() {
    await client.writeRegister(
        13,
        0
    );



    await client.writeRegister(
        14,
        state.controller.boardFault
    );



    await client.writeRegister(
        15,
        state.controller.powerType
    );


}

async function writeZones() {

    console.log("[MODBUS] writeZones: start, zones count =", Object.keys(state.zones).length);

    for (
        let zone = 1;
        zone <= 40;
        zone++
    ) {

        const register =
            0x0E + (zone - 1);

        const value =
            encodeZone(
                state.zones[zone]
            );

        console.log(`[MODBUS] writeZones: zone=${zone}, reg=0x${register.toString(16)}, value=${value}`);

        await client.writeRegister(
            register,
            value
        );
        console.log(`[MODBUS] writeZones: zone=${zone} OK`);
    }

    console.log("[MODBUS] writeZones: done");
}

async function writeDetectors() {

    console.log("[MODBUS] Запись детекторов (1-128)...");

    for (
        let address = 1;
        address <= 128;
        address++
    ) {

        const register =
            0x36 + (address - 1) * 2;

        const detector =
            state.detectors[address];

        const value =
            detector
                ? encodeDetector(
                    detector
                )
                : 0;

        try {
            await client.writeRegister(
                register,
                value
            );
            await client.writeRegister(
                register + 1,
                detector?.threshold ?? 0
            );
        } catch (err) {
            console.error(`[MODBUS] Ошибка записи детектора ${address} (регистр ${register}): ${err.message}`);
        }
    }

    console.log("[MODBUS] Запись детекторов завершена");
}

async function readZones() {
    state.zones = state.zones || {};
    console.log("[MODBUS] Чтение зон от slave...");
    for (let zone = 1; zone <= 40; zone++) {
        const register = 0x0E + (zone - 1);
        try {
            const result = await client.readHoldingRegisters(register, 1);
            console.log(result)
            const decoded = decodeZone(result.data[0]);
            state.zones[zone] = {
                exists: decoded.exists,
                state: decoded.state
            };
            console.log(`[MODBUS] чтение Zone ${zone}: exists=${decoded.exists}, state=${decoded.state}`);
        } catch (err) {
            console.error(`[MODBUS] Ошибка чтения зоны ${zone}: ${err.message}`);
        }
    }
    console.log("[MODBUS] Чтение зон завершено");
}

async function readDetectors() {
    state.detectors = state.detectors || {};
    console.log("[MODBUS] Чтение детекторов от slave...");
    for (let address = 1; address <= 128; address++) {
        const register = 0x36 + (address - 1) * 2;
        try {
            const result = await client.readHoldingRegisters(register, 1);
            const thresholdResult = await client.readHoldingRegisters(register + 1, 1);
            const decoded = decodeDetector(result.data[0]);
            console.log(decoded)
            state.detectors[address] = {
                ...state.detectors[address],
                present: decoded.present,
                // type и zone не обновляем — они задаются мастером, а не slave
                state: decoded.state,
                faultType: decoded.faultType,
                zone: decoded.zone,
                threshold: thresholdResult.data[0]
            };
            console.log(`[MODBUS] чтение Detector ${address} (Адрес: ${register}): state=${decoded.state}, zone=${decoded.zone}`);
        } catch (err) {
            console.error(`[MODBUS] Ошибка чтения детектора ${address}: ${err.message}`);
        }
    }
    console.log("[MODBUS] Чтение детекторов завершено");
}

async function readController() {
    try {
        const result3 = await client.readHoldingRegisters(3, 1);
        const result6 = await client.readHoldingRegisters(6, 1);
        state.controller.offSound = result3.data[0];
        state.controller.pollingInterval = result6.data[0];
        console.log(`[MODBUS] Controller: offSound=${result3.data[0]}, pollingInterval=${result6.data[0]}`);
    } catch (err) {
        console.error(`[MODBUS] Ошибка чтения контроллера: ${err.message}`);
    }
}

async function readAllFromSlave() {
    console.log("[MODBUS] Чтение всех регистров от slave...");
    await readController();
    await readZones();
    await readDetectors();
}

let isSyncing = false;
async function syncAll() {
    if (isSyncing) {
        console.log("[MODBUS] syncAll: уже выполняется, пропускаю");
        return;
    }
    isSyncing = true;
    try {
        console.log("[MODBUS] syncAll: start");

        await writeController();
        console.log("[MODBUS] syncAll: controller done");

        await writeZones();
        console.log("[MODBUS] syncAll: zones done");

        await writeDetectors();
        console.log("[MODBUS] syncAll: detectors done");
        state.statistics.lastSync = Date.now();
    } finally {
        isSyncing = false;
    }
}

module.exports = {
    client,
    connect,
    syncAll,
    writeSettings,
    writeController,
    writeZones,
    writeDetectors,
    readAllFromSlave,
    readZones,
    readDetectors,
    readController
};