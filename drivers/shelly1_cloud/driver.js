'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class Shelly1CloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly (Plus) 1 Cloud',
      battery: false,
      hostname: ['shelly1-', 'shellyplus1-', 'ShellyPlus1-']
    }
  }

}

module.exports = Shelly1CloudDriver;
