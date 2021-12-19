'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class Shelly25RollerShutterCloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 2.5 Rollershutter',
      battery: false,
      hostname: 'shellyswitch25-'
    }
  }

}

module.exports = Shelly25RollerShutterCloudDriver;
