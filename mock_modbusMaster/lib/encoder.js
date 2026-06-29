function encodeDetector(
    detector
) {

    let value = 0;

    if (
        detector.present
    ) {
        value |= 1;
    }

    value |=
        (
            detector.type & 0x03
        ) << 1;

    value |=
        (
            detector.state & 0x03
        ) << 3;

    value |=
        (
            detector.faultType & 0x03
        ) << 5;

    value |=
        (
            detector.zone & 0x3F
        ) << 7;

    return value;
}

function encodeZone(
    zone
) {

    let value = 0;

    if (zone.exists) {

        value |= 1;
    }

    value |=
        (
            zone.state & 0x03
        ) << 2;

    return value;
}

function decodeZone(value) {
    return {
        exists: (value & 1) !== 0,
        state: (value >> 2) & 0x03
    };
}

function decodeDetector(value) {
    return {
        present: (value & 1) !== 0,
        type: (value >> 1) & 0x03,
        state: (value >> 3) & 0x03,
        faultType: (value >> 5) & 0x03,
        zone: (value >> 7) & 0x3F
    };
}

module.exports = {
    encodeDetector,
    encodeZone,
    decodeDetector,
    decodeZone
};