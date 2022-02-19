'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class Shellyi4Driver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Plus i4',
      battery: false,
      gen: 'gen2',
      communication: 'websocket',
      hostname: ['shellyplusi4-', 'ShellyPlusI4-'],
      type: ['SNSN-0024X']
    }
  }

}

module.exports = Shellyi4Driver;
