'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyPlugCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Plug Cloud',
      battery: false,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shellyplug-'],
      type: ['SHPLG-1', 'SHPLG2-1', 'SHPLG-U1'],
      channels: 1
    }
  }

}

module.exports = ShellyPlugCloudDriver;
