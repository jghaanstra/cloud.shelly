'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class Shelly1pmDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 1PM',
      battery: false,
      hostname: 'shelly1pm-'
    }
  }

}

module.exports = Shelly1pmDriver;
