'use strict';

const Device = require('../device_zwave.js');

class ShellyWavePMMiniDevice extends Device {

  async registerCapabilities() {
    try {
      
      this.registerCapability('measure_power', 'METER');

      this.registerCapability('meter_power', 'METER');

    } catch (error) {
      this.error(error);
    }
  }

}

module.exports = ShellyWavePMMiniDevice;