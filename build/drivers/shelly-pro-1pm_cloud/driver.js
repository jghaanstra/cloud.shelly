'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyPro1PMCloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Pro 1PM Cloud',
      battery: false,
      hostname: ['ShellyPro1PM-']
    }
  }

}

module.exports = ShellyPro1PMCloudDriver;
