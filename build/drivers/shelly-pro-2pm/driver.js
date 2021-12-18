'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyPro2PMDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Pro 2PM',
      battery: false,
      hostname: 'ShellyPro2PM-'
    }
  }

}

module.exports = ShellyPro2PMDriver;
