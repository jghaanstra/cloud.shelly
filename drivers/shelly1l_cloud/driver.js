'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class Shelly1lCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 1L Cloud',
      battery: false,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shelly1l-'],
      type: ['SHSW-L'],
      channels: 1
    }
  }

}

module.exports = Shelly1lCloudDriver;
