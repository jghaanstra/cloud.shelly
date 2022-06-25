'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class ShellyDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    // TODO: solution for callbacks
    this.callbacks = [];

    this.bootSequence();

    // TODO: solution for capability listeners
    // CAPABILITY LISTENERS
    this.registerCapabilityListener("onoff", this.onCapabilityOnoff.bind(this));

  }

}

module.exports = ShellyDevice;
