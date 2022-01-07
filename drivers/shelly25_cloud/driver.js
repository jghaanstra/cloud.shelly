'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class Shelly25CloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 2.5 Relay Cloud',
      battery: false,
      hostname: ['shellyswitch25-']
    }
  }

}

module.exports = Shelly25CloudDriver;
