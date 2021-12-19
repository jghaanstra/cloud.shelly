'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class Shelly4ProCloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Pro 4(PM) Cloud',
      battery: false,
      hostname: 'shelly4pro-'
    }
  }

}

module.exports = Shelly4ProCloudDriver;
