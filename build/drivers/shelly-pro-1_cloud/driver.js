'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyPro1CloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Pro 1 Cloud',
      battery: false,
      hostname: 'ShellyPro1-'
    }
  }

}

module.exports = ShellyPro1CloudDriver;
