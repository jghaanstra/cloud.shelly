'use strict';

const Device = require('../device_zwave.js');

class ShellyWavePro1PMDevice extends Device {

  async registerCapabilities() {
    try {

      this.registerCapability('onoff', 'SWITCH_BINARY');
      
      this.registerCapability('measure_power', 'METER');

      this.registerCapability('meter_power', 'METER');

    } catch (error) {
      this.error(error);
    }    
  }

}

module.exports = ShellyWavePro1PMDevice;