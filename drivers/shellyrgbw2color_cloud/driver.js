'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyRGBW2ColorCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly RGBW2 Color Cloud',
      battery: false,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shellyrgbw2-'],
      type: ['SHRGBW2']
    }
  }

}

module.exports = ShellyRGBW2ColorCloudDriver;
