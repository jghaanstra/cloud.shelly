'use strict';

const Homey = require('homey');
const Device = require('../device_local.js');
const Util = require('../../lib/util.js');

class ShellyhtDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.callbacks = [];

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

module.exports = ShellyhtDevice;
