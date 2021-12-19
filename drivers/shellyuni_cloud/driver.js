'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyUniCloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Uni Cloud',
      battery: false,
      hostname: 'shellyuni-'
    }
  }

}

module.exports = ShellyUniCloudDriver;
