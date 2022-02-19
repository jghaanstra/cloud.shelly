'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyAirDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Air',
      battery: false,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shellyair-'],
      type: ['SHAIR-1']
    }
  }

}

module.exports = ShellyAirDriver;
