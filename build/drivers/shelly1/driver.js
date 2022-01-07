'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class Shelly1Driver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly (Plus) 1',
      battery: false,
      hostname: ['shelly1-', 'shellyplus1-', 'ShellyPlus1-']
    }
  }

}

module.exports = Shelly1Driver;
