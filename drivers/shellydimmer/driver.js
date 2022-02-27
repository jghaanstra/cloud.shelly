'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyDimmerDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Dimmer',
      battery: false,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shellydimmer-', 'shellydimmer2-'],
      type: ['SHDM-1', 'SHDM-2'],
      channels: 1
    }
  }

}

module.exports = ShellyDimmerDriver;
