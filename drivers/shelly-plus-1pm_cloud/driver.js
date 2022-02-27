'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyPlus1PMCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Plus 1PM Cloud',
      battery: false,
      gen: 'gen2',
      communication: 'cloud',
      hostname: ['shellyplus1pm-', 'ShellyPlus1PM-'],
      type: ['SNSW-001P16EU'],
      channels: 1
    }
  }

}

module.exports = ShellyPlus1PMCloudDriver;
