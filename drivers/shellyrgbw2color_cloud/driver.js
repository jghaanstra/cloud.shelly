'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyRGBW2ColorCloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly RGBW2 Color Cloud',
      battery: false,
      hostname: 'shellyrgbw2-',
      type: 'SHRGBW2-color'
    }
  }

}

module.exports = ShellyRGBW2ColorCloudDriver;
