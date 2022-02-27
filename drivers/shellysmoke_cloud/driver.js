'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellySmokeCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Smoke',
      battery: true,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shellysmoke-'],
      type: ['SHSM-01', 'SHSM-02'],
      channels: 1
    }
  }

}

module.exports = ShellySmokeCloudDriver;
