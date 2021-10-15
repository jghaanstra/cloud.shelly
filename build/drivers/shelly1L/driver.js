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
      hostname: 'shelly1l-'
    }
  }

}

module.exports = Shelly1lDriver;
