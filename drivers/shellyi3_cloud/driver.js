'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class Shellyi3DriverCloud extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly i3 Cloud',
      battery: false,
      hostname: ['shellyi3-'],
      code: ['SHIX3-1']
    }
  }

}

module.exports = Shellyi3DriverCloud;
