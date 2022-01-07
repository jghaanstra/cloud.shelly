'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyRGBW2ColorDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly RGBW2 Color',
      battery: false,
      hostname: ['shellyrgbw2-']
    }
  }

}

module.exports = ShellyRGBW2ColorDriver;
