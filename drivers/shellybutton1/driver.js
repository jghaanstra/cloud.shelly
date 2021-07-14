'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyButton1Driver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Button 1',
      battery: true,
      hostname: 'shellybutton1-'
    }
  }

}

module.exports = ShellyButton1Driver;
