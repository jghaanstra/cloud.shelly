'use strict';

const Homey = require('homey');
const Driver = require('../one_driver.js');
const Util = require('../../lib/util.js');

class ShellyDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});
  }

}

module.exports = ShellyDriver;
