'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyPlugDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Plug',
      battery: false,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shellyplug-'],
      type: ['SHPLG-1', 'SHPLG2-1', 'SHPLG-U1']
    }
  }

}

module.exports = ShellyPlugDriver;
