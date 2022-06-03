'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class ShellyPlugDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.bootSequence();

    // CAPABILITY LISTENERS
    this.registerCapabilityListener("onoff", this.onCapabilityOnoff.bind(this));

  }

}

module.exports = ShellyPlugDevice;
