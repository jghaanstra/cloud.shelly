'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyUniCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Uni Cloud',
      battery: false,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shellyuni-'],
      type: ['SHUNI-1']
    }
  }

}

module.exports = ShellyUniCloudDriver;
