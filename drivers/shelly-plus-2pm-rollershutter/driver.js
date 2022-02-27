'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyPlus2PMRollerShutterDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Plus 2PM Roller Shutter',
      battery: false,
      gen: 'gen2',
      communication: 'websocket',
      hostname: ['shellyplus2pm-', 'ShellyPlus2PM-'],
      type: ['SNSW-002P16EU'],
      channels: 1
    }
  }

}

module.exports = ShellyPlus2PMRollerShutterDriver;
