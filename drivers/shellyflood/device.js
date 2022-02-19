'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class ShellyFloodDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.setAvailable();

    this.bootSequence();

  }

}

module.exports = ShellyFloodDevice;
