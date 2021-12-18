'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyTRVDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly TRV',
      battery: true,
      hostname: 'shellytrv-'
    }
  }

}

module.exports = ShellyTRVDriver;
