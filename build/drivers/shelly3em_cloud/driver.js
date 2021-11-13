'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class Shelly3EmCloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 3EM Cloud',
      battery: false,
      hostname: 'shellyem3-',
      type: 'SHEM-3'
    }
  }

}

module.exports = Shelly3EmCloudDriver;