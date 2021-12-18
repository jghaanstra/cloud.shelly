'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyPro2Driver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Pro 2',
      battery: false,
      hostname: 'ShellyPro2-'
    }
  }

}

module.exports = ShellyPro2Driver;
