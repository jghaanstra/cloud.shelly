'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyPro1PMDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Pro 1PM',
      battery: false,
      gen: 'gen2',
      communication: 'websocket',
      hostname: ['ShellyPro1PM-'],
      type: ['SPSW-001PE16EU']
    }
  }

}

module.exports = ShellyPro1PMDriver;
