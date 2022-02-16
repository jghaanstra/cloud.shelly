'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class Shelly1pmCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 1PM Cloud',
      battery: false,
      hostname: ['shelly1pm-', 'shellyplus1pm-', 'ShellyPlus1PM-'],
      code: ['SHSW-PM', 'SNSW-001P16EU']
    }
  }

}

module.exports = Shelly1pmCloudDriver;
