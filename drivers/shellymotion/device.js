'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class ShellyMotionDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    if (this.getStoreValue('type') === 'SHMOS-02' && !this.hasCapability('measure_temperature')) {
      this.addCapability('measure_temperature');
    }

    this.bootSequence();

  }

}

module.exports = ShellyMotionDevice;
