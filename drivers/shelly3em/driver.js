'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class Shelly3EmDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 3EM',
      battery: false,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shellyem3-'],
      type: ['SHEM-3']
    }
  }

}

module.exports = Shelly3EmDriver;
