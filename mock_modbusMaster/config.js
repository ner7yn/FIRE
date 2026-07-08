module.exports = {
    modbus: {
        port: "/dev/ttys006",
        slaveId: 69,

        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: "none",

        pollInterval: 20000
    },

    web: {
        port: 3333
    },

    emulator: {
        detectorCount: 50,

        minAddress: 1,
        maxAddress: 127,

        eventInterval: 30000,

        settings: {
            1: 0,
            2: 0,
            3: 1,
            4: 15,
            5: 0,
            6: 0,
            7: 3,
            8: 0,
            9: 0,
            10: 1,
            11: 0,
            12: 0
        }
    }
};