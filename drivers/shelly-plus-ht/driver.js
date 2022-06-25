'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyPlusHTDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Plus HT',
      battery: true,
      gen: 'gen2',
      communication: 'websocket',
      hostname: ['shellyplusht-', 'ShellyPlusHT-'],
      type: ['SNSN-0013A'],
      channels: 1
    }
  }

}

module.exports = ShellyPlusHTDriver;
