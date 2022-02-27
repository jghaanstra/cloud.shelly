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
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shellyrgbw2-'],
      type: ['SHRGBW2'],
      channels: 1
    }
  }

}

module.exports = ShellyRGBW2ColorDriver;
