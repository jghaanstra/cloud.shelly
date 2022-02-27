'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class Shelly1CloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 1 Cloud',
      battery: false,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shelly1-'],
      type: ['SHSW-1'],
      channels: 1
    }
  }

}

module.exports = Shelly1CloudDriver;
