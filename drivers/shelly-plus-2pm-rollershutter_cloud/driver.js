'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyPlus2PMRollerShutterCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Plus 2PM Roller Shutter Cloud',
      battery: false,
      gen: 'gen2',
      communication: 'cloud',
      hostname: ['shellyplus2pm-', 'ShellyPlus2PM-'],
      type: ['SNSW-002P16EU'],
      channels: 1
    }
  }

}

module.exports = ShellyPlus2PMRollerShutterCloudDriver;
