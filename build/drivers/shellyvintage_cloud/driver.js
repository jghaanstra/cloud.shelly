'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyVintageCloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Vintage Cloud',
      battery: false,
      hostname: 'ShellyVintage-',
      type: 'SHVIN-1'
    }
  }

}

module.exports = ShellyVintageCloudDriver;
