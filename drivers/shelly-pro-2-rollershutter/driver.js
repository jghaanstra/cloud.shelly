'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyPro2RollerShutterDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Pro 2 Roller Shutter',
      battery: false,
      gen: 'gen2',
      communication: 'websocket',
      hostname: ['shellypro2-', 'ShellyPro2-'],
      type: ['SPSW-002XE16EU'],
      channels: 1
    }
  }

}

module.exports = ShellyPro2RollerShutterDriver;
