'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyVintageDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Vintage',
      battery: false,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['ShellyVintage-'],
      type: ['SHVIN-1']
    }
  }

}

module.exports = ShellyVintageDriver;
