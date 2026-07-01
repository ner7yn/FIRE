const state = require("../state/state");
const { handleAddressChange } = require("../lib/addressChange");

(async () => {
   // Подготовка: создаём детектор по старому адресу
   const oldAddr = 5;
   const newAddr = 10;

   state.detectors = state.detectors || {};
   state.detectors[oldAddr] = {
      present: 1,
      type: 1,
      state: 2,
      faultType: 0,
      zone: 3,
      address: oldAddr
   };

   // Формируем регистр: бит0 = execute, bits 1-7 = oldAddress, bits 8-14 = newAddress
   const registerValue = (newAddr << 8) | (oldAddr << 1) | 1;

   const client = {
      async readHoldingRegisters(regAddr, length) {
         console.log("stub: readHoldingRegisters", regAddr, length);
         return { data: [registerValue] };
      },
      async writeRegister(register, value) {
         console.log("stub: writeRegister", register, value);
         return;
      }
   };

   await handleAddressChange(client);

   console.log("Resulting detectors:", JSON.stringify(state.detectors, null, 2));
})();
