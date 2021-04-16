'use strict';

const Homey = require('homey');
const Device = require('../device.js');
const Util = require('/lib/util.js');

class ShellyGasDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];
    // TODO: REMOVE AFTER 3.1.0
    this.temp_callbacks = [
      'alarm_off',
      'alarm_mild',
      'alarm_heavy'
    ];

    this.homey.flow.getDeviceTriggerCard('triggerGasConcentration');

    this.setAvailable();

    if (!this.getStoreValue('sdk') === 3) {
      // TODO: REMOVE AFTER 3.1.0
      if (this.hasCapability('button.callbackevents')) {
        this.removeCapability('button.callbackevents');
      }
      if (this.hasCapability('button.removecallbackevents')) {
        this.removeCapability('button.removecallbackevents');
      }
      this.setStoreValue("sdk", 3);
    }

    // INITIAL UPDATE AND POLLING
    this.bootSequence();

  }

  // HELPER FUNCTIONS

  // TODO: REMOVE AFTER 3.1.0
  async removeCallbacks() {
    return await this.util.removeCallbackEvents('/settings/actions?index=0&name=', this.temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
  }

}

module.exports = ShellyGasDevice;
