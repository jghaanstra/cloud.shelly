'use strict';

const Device = require('../device_zwave.js');

class ShellyWave2PMDevice extends Device {

  async registerCapabilities() {
    try {

      // TODO: remove with the next release
      if (this.getStoreValue('channel') === 0 && this.hasCapability('meter_power')) {
        this.removeCapability('meter_power');
      }
      if (this.getStoreValue('channel') === 0 && this.hasCapability('measure_power')) {
        this.removeCapability('measure_power');
      }

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