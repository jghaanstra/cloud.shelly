'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class Shelly2RollerShutterCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 2 Roller Shutter Cloud',
      battery: false,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shelly2-'],
      type: ['SHSW-21'],
      channels: 1
    }
  }

}

module.exports = Shelly2RollerShutterCloudDriver;
