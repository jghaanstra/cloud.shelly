'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyPlus1CloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Plus 1 Cloud',
      battery: false,
      gen: 'gen2',
      communication: 'cloud',
      hostname: ['shellyplus1-', 'ShellyPlus1-'],
      code: ['SNSW-001X16EU']
    }
  }

}

module.exports = ShellyPlus1CloudDriver;
