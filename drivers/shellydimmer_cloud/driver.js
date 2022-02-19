'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyDimmerCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Dimmer Cloud',
      battery: false,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shellydimmer-', 'shellydimmer2-'],
      type: ['SHDM-1', 'SHDM-2']
    }
  }

}

module.exports = ShellyDimmerCloudDriver;
