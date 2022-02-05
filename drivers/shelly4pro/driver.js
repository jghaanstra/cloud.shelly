'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class Shelly4ProDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Pro 4(PM)',
      battery: false,
      hostname: ['shelly4pro-', 'shellypro4pm-', 'ShellyPro4PM-']
    }
  }

}

module.exports = Shelly4ProDriver;
