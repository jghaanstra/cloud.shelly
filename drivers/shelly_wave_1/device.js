'use strict';

const Device = require('../device_zwave.js');

class ShellyWave1Device extends Device {

  async registerCapabilities() {
    try {

      this.registerCapability('onoff', 'SWITCH_BINARY');

    } catch (error) {
      this.error(error);
    }    
  }

}

module.exports = ShellyWave1Device;