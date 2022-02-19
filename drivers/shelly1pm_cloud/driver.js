'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class Shelly1pmCloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 1PM Cloud',
      battery: false,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shelly1pm-'],
      code: ['SHSW-PM']
    }
  }

}

module.exports = Shelly1pmCloudDriver;
