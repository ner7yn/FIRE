const state = {

    controller: {
        boardFault: 0,
        powerType: 0,
        pollingInterval: 3,
        offSound: 15,
    },

    settings: {},

    zones: {},

    detectors: {},

    statistics: {
        lastSync: null,
        connected: false,
        totalDetectors: 0,
        totalZones: 0
    }

};

module.exports = state;