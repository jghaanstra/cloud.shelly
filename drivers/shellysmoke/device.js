'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class ShellySmokeDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

    this.bootSequence();

  }

}

module.exports = ShellySmokeDevice;
