'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyMotionCloudDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Motion',
      battery: true,
      hostname: 'shellymotionsensor-'
    }
  }

}

module.exports = ShellyMotionCloudDriver;
