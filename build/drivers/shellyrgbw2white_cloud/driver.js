'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyRGBW2WhiteCloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly RGBW2 White Cloud',
      battery: false,
      hostname: 'shellyrgbw2-'
    }
  }

}

module.exports = ShellyRGBW2WhiteCloudDriver;
