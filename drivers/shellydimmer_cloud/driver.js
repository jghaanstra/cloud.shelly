'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyDimmerCloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Dimmer Cloud',
      battery: false,
      hostname: 'shellydimmer',
      type: 'SHDM-1'
    }
  }

}

module.exports = ShellyDimmerCloudDriver;
