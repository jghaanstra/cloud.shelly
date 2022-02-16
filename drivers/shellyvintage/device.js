'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class ShellyVintageDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.setAvailable();

    this.bootSequence();

    // CAPABILITY LISTENERS
    this.registerCapabilityListener("onoff", this.onCapabilityOnoffLight.bind(this));
    this.registerCapabilityListener("dim", this.onCapabilityDim.bind(this));

  }

}

module.exports = ShellyVintageDevice;
