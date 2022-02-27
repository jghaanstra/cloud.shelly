'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class Shelly2RollerShutterDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 2 Roller Shutter',
      battery: false,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shelly2-'],
      type: ['SHSW-21'],
      channels: 1
    }
  }

}

module.exports = Shelly2RollerShutterDriver;
