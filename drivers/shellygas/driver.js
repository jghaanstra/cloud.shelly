'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyGasDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Gas',
      battery: false,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shellygas-'],
      type: ['SHGS-1'],
      channels: 1
    }
  }

}

module.exports = ShellyGasDriver;
