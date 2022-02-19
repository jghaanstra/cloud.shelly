'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class Shelly25Driver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 2.5 Relay',
      battery: false,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shellyswitch25-'],
      type: ['SHSW-25']
    }
  }

}

module.exports = Shelly25Driver;
