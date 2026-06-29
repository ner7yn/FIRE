const state = require("../state/state");

function calculateZoneState(zoneId) {

    const detectors =
        Object.values(
            state.detectors
        ).filter(
            d =>
                d.zone === zoneId &&
                d.enabled
        );

    if (!detectors.length)
        return 0;

    if (
        detectors.some(
            d => d.state === 2
        )
    ) {
        return 2;
    }

    if (
        detectors.some(
            d => d.state === 1
        )
    ) {
        return 1;
    }

    if (
        detectors.some(
            d => d.state === 3
        )
    ) {
        return 3;
    }

    return 0;
}

function rebuildZones() {

    const zones = {};

    for (
        let zone = 1;
        zone <= 40;
        zone++
    ) {

        zones[zone] = {
            exists: false,
            state: 0
        };
    }

    for (
        const detector of
        Object.values(
            state.detectors
        )
    ) {
        if (
            detector.zone >= 1 &&
            detector.zone <= 40
        ) {
            zones[
                detector.zone
            ].exists = true;
        }
    }

    for (
        let zone = 1;
        zone <= 40;
        zone++
    ) {

        zones[
            zone
        ].state =
            calculateZoneState(
                zone
            );
    }

    state.zones = zones;

    state.statistics.totalZones =
        Object.values(
            zones
        ).filter(
            z => z.exists
        ).length;
}

module.exports = {
    rebuildZones
};