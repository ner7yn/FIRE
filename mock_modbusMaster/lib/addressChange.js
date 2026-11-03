const state =
    require(
        "../state/state"
    );

const { encodeDetector } = require("./encoder");

async function handleAddressChange(
    client
) {
    console.log('зашёл в handleAddressChange')
    const result =
        await client
            .readHoldingRegisters(
                12,
                1
            );
    console.log('12 регистр', result)

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
    console.log(`Address change requested: ${oldAddress} -> ${newAddress}`);
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


    // Переносим ссылку на объект детектора (сохранить все вложенные данные и ссылки)
    const detectorObj = state.detectors[oldAddress];

    // Если новый адрес занят, предупреждаем и перезаписываем
    if (state.detectors[newAddress]) {
        console.log(
            `Warning: overwriting detector at ${newAddress}`
        );
    }

    // Переносим объект и обновляем поле address
    state.detectors[newAddress] = detectorObj;
    if (state.detectors[newAddress]) {
        state.detectors[newAddress].address = newAddress;
    }

    // Удаляем старую запись
    delete state.detectors[oldAddress];

    console.log(`Detector moved ${oldAddress} -> ${newAddress}`);

    // Обновляем регистры Modbus: новый адрес — записываем данные, старый — очищаем
    const regNew = 0x36 + (newAddress - 1) * 2;
    const regOld = 0x36 + (oldAddress - 1) * 2;
    const oldThreshold = detectorObj.threshold ?? 0;

    try {
        const newVal = state.detectors[newAddress]
            ? encodeDetector(state.detectors[newAddress])
            : 0;

        await client.writeRegister(regNew, newVal);
        await client.writeRegister(regNew + 1, oldThreshold);

        // Очищаем старый регистр (теперь там нет детектора)
        await client.writeRegister(regOld, 0);
        await client.writeRegister(regOld + 1, 0);
    } catch (err) {
        console.error(`[MODBUS] Error writing detector registers: ${err.message}`);
    }

    const cleared = register & 0xFFFE;

    await client.writeRegister(12, cleared);
}

module.exports = {
    handleAddressChange
};