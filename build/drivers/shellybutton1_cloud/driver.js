'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyButton1CloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Button 1 Cloud',
      battery: true,
      hostname: ['shellybutton1-']
    }
  }

}

module.exports = ShellyButton1CloudDriver;
