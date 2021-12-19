'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyPlugSCloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Plug S Cloud',
      battery: false,
      hostname: 'shellyplug-s-'
    }
  }

}

module.exports = ShellyPlugSCloudDriver;
