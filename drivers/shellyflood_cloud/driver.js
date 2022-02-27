'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyFloodCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Flood',
      battery: true,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shellyflood-'],
      type: ['SHWT-1'],
      channels: 1
    }
  }

}

module.exports = ShellyFloodCloudDriver;
