'use strict';

const Device = require('../device_zwave.js');

class ShellyWavePro3Device extends Device {

  async registerCapabilities() {
    try {

      this.registerCapability('onoff', 'SWITCH_BINARY');

    } catch (error) {
      this.error(error);
    }
  }

}

module.exports = ShellyWavePro3Device;