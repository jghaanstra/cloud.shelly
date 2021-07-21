'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class ShellyhtDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.setAvailable();

    // INITIAL UPDATE AND POLLING
    this.bootSequence();

  }

}

module.exports = ShellyhtDevice;
