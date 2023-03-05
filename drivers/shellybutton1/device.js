'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class ShellyButton1Device extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [
      'shortpush',
      'double_shortpush',
      'triple_shortpush',
      'longpush'
    ];

    this.bootSequence();

    // REFRESHING DEVICE CONFIG AND REGISTERING DEVICE TRIGGER CARDS
    this.homey.setTimeout(async () => {
      try {
        await this.updateDeviceConfig();
      } catch (error) {
        this.log(error);
      }
    }, 2000);

  }

}

module.exports = ShellyButton1Device;
