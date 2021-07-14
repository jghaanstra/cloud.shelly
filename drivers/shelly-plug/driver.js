'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyPlugDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Plug',
      battery: false,
      hostname: 'shellyplug-'
    }
  }

}

module.exports = ShellyPlugDriver;
