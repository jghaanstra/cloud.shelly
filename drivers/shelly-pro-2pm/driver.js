'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyPro2PMDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Pro 2PM Relay',
      battery: false,
      gen: 'gen2',
      communication: 'websocket',
      hostname: ['ShellyPro2PM-'],
      type: ['SPSW-002PE16EU']
    }
  }

}

module.exports = ShellyPro2PMDriver;
