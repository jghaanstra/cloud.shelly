'use strict';

const Device = require('../device_zwave.js');

class ShellyWave2PMDevice extends Device {

  async registerCapabilities() {
    try {

      // Relay 1
      this.registerCapability('onoff', 'SWITCH_BINARY', {multiChannelNodeId: 1});
      // this.registerCapability('measure_power', 'METER', {multiChannelNodeId: 1});
      // this.registerCapability('meter_power', 'METER', {multiChannelNodeId: 1});

      // Relay 2
      this.registerCapability('onoff', 'SWITCH_BINARY', {multiChannelNodeId: 2});
      // this.registerCapability('measure_power', 'METER', {multiChannelNodeId: 2});
      // this.registerCapability('meter_power', 'METER', {multiChannelNodeId: 2});

    } catch (error) {
      this.error(error);
    }
  }

}

module.exports = ShellyWave2PMDevice;