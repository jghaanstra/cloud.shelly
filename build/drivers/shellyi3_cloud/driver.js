'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class Shellyi3Driver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly i3 Cloud',
      battery: false,
      hostname: 'shellyi3-',
      type: 'SHIX3-1'
    }
  }

}

module.exports = Shellyi3Driver;
