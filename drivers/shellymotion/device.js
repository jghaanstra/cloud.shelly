'use strict';

const Homey = require('homey');
const Device = require('../device.js');
const Util = require('/lib/util.js');

class ShellyMotionDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    // TODO: REMOVE AFTER 3.1.0
    this.setStoreValue("battery", true);

    this.setAvailable();

    // INITIAL UPDATE AND POLLING
    this.bootSequence();

  }

}

module.exports = ShellyMotionDevice;
