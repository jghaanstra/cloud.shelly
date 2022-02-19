'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyEmDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly EM',
      battery: false,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shellyem-'],
      type: ['SHEM']
    }
  }

}

module.exports = ShellyEmDriver;
