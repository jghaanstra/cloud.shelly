'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyPro2RollerShutterDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Pro 2 RollerShutter',
      battery: false,
      hostname: ['ShellyPro2-']
    }
  }

}

module.exports = ShellyPro2RollerShutterDriver;
