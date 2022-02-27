'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class Shelly25RollerShutterDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 2.5 Roller Shutter',
      battery: false,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shellyswitch25-'],
      type: ['SHSW-25'],
      channels: 1
    }
  }

}

module.exports = Shelly25RollerShutterDriver;
