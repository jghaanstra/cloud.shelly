'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyhtCloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly HT',
      battery: true,
      hostname: 'shellyht-',
      type: 'SHHT-1'
    }
  }

}

module.exports = ShellyhtCloudDriver;
