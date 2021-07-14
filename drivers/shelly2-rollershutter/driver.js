'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class Shelly2RollerShutterDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 2 Rollershutter',
      battery: false,
      hostname: 'shelly2-'
    }
  }

}

module.exports = Shelly2RollerShutterDriver;
