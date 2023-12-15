'use strict';

const Device = require('../device_zwave.js');

class ShellyWave2PMDevice extends Device {

  async registerCapabilities() {
    try {

      this.registerCapability('onoff', 'SWITCH_BINARY');
      
      if (this.hasCapability('measure_power')) {
        this.registerCapability('measure_power', 'METER');
      }
      
      if (this.hasCapability('meter_power')) {
        this.registerCapability('meter_power', 'METER');
      }

    } catch (error) {
      this.error(error);
    }
  }

}

module.exports = ShellyWave2PMDevice;