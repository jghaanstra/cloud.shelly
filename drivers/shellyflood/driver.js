'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyFloodDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Flood',
      battery: true,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shellyflood-'],
      type: ['SHWT-1']
    }
  }

}

module.exports = ShellyFloodDriver;
