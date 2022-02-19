'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyDuoDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Duo',
      battery: false,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['ShellyBulbDuo-'],
      type: ['SHBDUO-1']
    }
  }

}

module.exports = ShellyDuoDriver;
