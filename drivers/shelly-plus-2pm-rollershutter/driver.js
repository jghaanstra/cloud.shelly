'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyPlus2PMRollerShutterDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Plus 2PM Rollershutter',
      battery: false,
      hostname: ['ShellyPlus2PM-']
    }
  }

}

module.exports = ShellyPlus2PMRollerShutterDriver;
