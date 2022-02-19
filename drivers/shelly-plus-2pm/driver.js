'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyPlus2PMDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Plus 2PM Relay',
      battery: false,
      gen: 'gen2',
      communication: 'websocket',
      hostname: ['ShellyPlus2PM-'],
      type: ['SNSW-002P16EU']
    }
  }

}

module.exports = ShellyPlus2PMDriver;
