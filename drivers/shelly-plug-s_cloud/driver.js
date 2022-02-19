'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyPlugSCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Plug S Cloud',
      battery: false,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shellyplug-s-'],
      type: ['SHPLG-S']
    }
  }

}

module.exports = ShellyPlugSCloudDriver;
