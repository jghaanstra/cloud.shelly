'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyPlus2PMCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Plus 2PM Relay Cloud',
      battery: false,
      gen: 'gen2',
      communication: 'cloud',
      hostname: ['ShellyPlus2PM-'],
      type: ['SNSW-002P16EU']
    }
  }

}

module.exports = ShellyPlus2PMCloudDriver;
