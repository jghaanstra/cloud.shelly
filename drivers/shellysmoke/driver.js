'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellySmokeDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Smoke',
      battery: true,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shellysmoke-'],
      type: ['SHSM-01', 'SHSM-02']
    }
  }

}

module.exports = ShellySmokeDriver;
