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
      hostname: ['shelly1l-'],
      code: ['SHSW-L']
    }
  }

}

module.exports = Shelly1lCloudDriver;
