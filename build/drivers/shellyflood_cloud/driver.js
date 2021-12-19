'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyFloodCloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Flood',
      battery: true,
      hostname: 'shellyflood-'
    }
  }

}

module.exports = ShellyFloodCloudDriver;
