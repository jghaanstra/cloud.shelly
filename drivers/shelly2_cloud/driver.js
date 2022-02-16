'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class Shelly2CloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 2 Relay Cloud',
      battery: false,
      hostname: ['shelly2-'],
      code: ['SHSW-21']
    }
  }

}

module.exports = Shelly2CloudDriver;
