'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyBulbDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Bulb (RGBW)',
      battery: false,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shellybulb-', 'shellycolorbulb-'],
      type: ['SHCB-1', 'SHCL-255', 'SHBLB-1'],
      channels: 1
    }
  }

}

module.exports = ShellyBulbDriver;
