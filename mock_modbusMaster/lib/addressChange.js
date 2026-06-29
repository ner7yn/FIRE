const state =
    require(
        "../state/state"
    );

async function handleAddressChange(
    client
) {

    const result =
        await client
            .readHoldingRegisters(
                11,
                1
            );

    const register =
        result.data[0];

    const execute =
        register & 1;

    if (!execute)
        return;

    const oldAddress =
        (
            register >> 1
        ) & 0x7F;

    const newAddress =
        (
            register >> 8
        ) & 0x7F;

    if (
        !state.detectors[
        oldAddress
        ]
    ) {

        console.log(
            "Detector not found:",
            oldAddress
        );

        return;
    }

    state.detectors[
        newAddress
    ] = {

        ...state.detectors[
        oldAddress
        ],

        address:
            newAddress
    };

    delete state.detectors[
        oldAddress
    ];

    console.log(
        `Detector moved ${oldAddress} -> ${newAddress}`
    );

    const cleared =
        register &
        0xFFFE;

    await client
        .writeRegister(
            11,
            cleared
        );
}

module.exports = {
    handleAddressChange
};