const config = require("../config");
const state = require("../state/state");

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDetector(address) {

    const type = random(1, 3);

    return {
        address,

        present: true,
        enabled: true,

        type,

        state: 0,

        faultType: 0,

        zone: 0,

        threshold: type === 1 ? 0 : type === 2 ? 20 : 40
    };
}

function initDetectors() {

    // Очищаем предыдущие детекторы, если нужно
    state.detectors = {};

    // Генерируем первые config.emulator.detectorCount адресов
    const startAddress = config.emulator.minAddress;
    const endAddress = Math.min(
        startAddress + config.emulator.detectorCount - 1,
        config.emulator.maxAddress
    );

    for (let address = startAddress; address <= endAddress; address++) {
        state.detectors[address] = generateDetector(address);
    }

    state.statistics.totalDetectors =
        Object.keys(state.detectors).length;

    console.log(
        `Generated ${state.statistics.totalDetectors} detectors`
    );
}

function generateEvents() {

    const addresses =
        Object.keys(state.detectors);

    if (!addresses.length)
        return;

    const randomAddress =
        addresses[
        random(
            0,
            50
        )
        ];

    const detector =
        state.detectors[randomAddress];

    const event =
        random(0, 100);

    if (event < 70) {

        detector.state = 0;
        detector.faultType = 0;
    }
    else if (event < 80) {

        detector.state = 1;
        detector.faultType = 0;
    }
    else if (event < 90) {

        detector.state = 2;
        detector.faultType = 0;
    }
    else {

        detector.state = 3;

        detector.faultType =
            random(1, 3);
    }
}

module.exports = {
    initDetectors,
    generateEvents
};