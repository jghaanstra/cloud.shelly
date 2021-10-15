'use strict';

const Homey = require('homey');
const Device = require('../device_cloud.js');
const Util = require('../../lib/util.js');

class ShellyButton1CloudDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [
      'shortpush',
      'double_shortpush',
      'triple_shortpush',
      'longpush'
    ];

    this.setAvailable();

    // INITIAL UPDATE
    this.bootSequence();

  }

}

module.exports = ShellyButton1CloudDevice;
