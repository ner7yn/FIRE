module.exports = {
    modbus: {
        port: "/dev/ttys007",
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
            0x01: 0,
            0x02: 0,
            0x03: 1,
            0x04: 15,
            0x05: 0,
            0x06: 0,
            0x07: 3,
            0x08: 0,
        }
    }
};