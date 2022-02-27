'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyPlugSDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Plug S',
      battery: false,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shellyplug-s-'],
      type: ['SHPLG-S'],
      channels: 1
    }
  }

}

module.exports = ShellyPlugSDriver;
