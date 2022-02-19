'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class Shelly4ProDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    if (this.getStoreValue('communication') === 'websocket') {
      this.callbacks = [
        'shortpush',
        'longpush'
      ];
    } else {
      this.callbacks = [];
    }

    this.setAvailable();

    this.bootSequence();

    // CAPABILITY LISTENERS
    this.registerCapabilityListener("onoff", this.onCapabilityOnoff.bind(this));

  }

}

module.exports = Shelly4ProDevice;
