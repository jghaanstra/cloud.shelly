'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class Shellyi4Driver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly i4',
      battery: false,
      hostname: 'shellyi4-'
    }
  }

}

module.exports = Shellyi4Driver;
