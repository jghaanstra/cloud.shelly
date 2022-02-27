'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyBulbCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Bulb (RGBW) Cloud',
      battery: false,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shellybulb-', 'shellycolorbulb-'],
      type: ['SHCB-1', 'SHCL-255', 'SHBLB-1'],
      channels: 1
    }
  }

}

module.exports = ShellyBulbCloudDriver;
