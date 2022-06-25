'use strict';

const Homey = require('homey');
const Driver = require('../driver_one.js');
const Util = require('../../lib/util.js');

class ShellyDevice extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});
  }

}

module.exports = ShellyDevice;
