'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyhtCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly HT',
      battery: true,
      hostname: ['shellyht-'],
      code: ['SHHT-1']
    }
  }

}

module.exports = ShellyhtCloudDriver;
