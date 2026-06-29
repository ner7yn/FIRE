const state = {

    controller: {
        boardFault: 0,
        powerType: 0
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