'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyPlus1PMDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Plus 1PM',
      battery: false,
      gen: 'gen2',
      communication: 'websocket',
      hostname: ['shellyplus1pm-', 'ShellyPlus1PM-'],
      code: ['SNSW-001P16EU']
    }
  }

}

module.exports = ShellyPlus1PMDriver;
