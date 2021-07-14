'use strict';

const Homey = require('homey');
const Device = require('../device.js');
const Util = require('../../lib/util.js');

class ShellydwDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];
    // TODO: REMOVE AFTER 3.1.0
    this.temp_callbacks = [
      'dark',
      'twilight',
      'open',
      'close',
      'vibration',
      'temp_over',
      'temp_under'
    ];

    this.homey.flow.getDeviceTriggerCard('triggerTilt');

    // TODO: REMOVE AFTER 3.1.0
    this.setStoreValue("battery", true);

    this.setAvailable();

    if (!this.getStoreValue('sdk') === 3) {
      // TODO: REMOVE AFTER 3.1.0
      if (this.hasCapability('measure_voltage')) {
        this.removeCapability('measure_voltage');
      }
      if (this.hasCapability('button.callbackevents')) {
        this.removeCapability('button.callbackevents');
      }
      if (this.hasCapability('button.removecallbackevents')) {
        this.removeCapability('button.removecallbackevents');
      }
      this.setStoreValue("sdk", 3);
    }

    // START POLLING IF COAP IS DISABLED OR TRY INITIAL UPDATE
    this.bootSequence();

  }

  // HELPER FUNCTIONS

  // TODO: REMOVE AFTER 3.1.0
  async removeCallbacks() {
    await this.util.removeCallbackEvents('/settings?', this.temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    await this.util.removeCallbackEvents('/settings/actions?index=0&name=', this.temp_callbacks, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
    return Promise.resolve(true);
  }

}

module.exports = ShellydwDevice;
