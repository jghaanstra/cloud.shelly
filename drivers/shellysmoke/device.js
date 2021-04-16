'use strict';

const Homey = require('homey');
const Device = require('../device.js');
const Util = require('/lib/util.js');

class ShellySmokeDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    // TODO: REMOVE AFTER 3.1.0
    this.setStoreValue("battery", true);

    this.setAvailable();

    if (!this.getStoreValue('sdk') === 3) {
      // TODO: REMOVE AFTER 3.1.0
      if (this.hasCapability('measure_voltage')) {
        this.removeCapability('measure_voltage');
      }
      this.setStoreValue("sdk", 3);
    }

    // START POLLING IF COAP IS DISABLED OR TRY INITIAL UPDATE
    this.bootSequence();

  }

}

module.exports = ShellySmokeDevice;
