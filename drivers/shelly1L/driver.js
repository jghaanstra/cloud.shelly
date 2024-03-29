'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class Shelly1lDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 1L',
      battery: false,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shelly1l-'],
      type: ['SHSW-L'],
      channels: 1
    }
  }

}

module.exports = Shelly1lDriver;
