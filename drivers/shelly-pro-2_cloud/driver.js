'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyPro2CloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Pro 2 Cloud',
      battery: false,
      hostname: ['ShellyPro2-'],
      code: ['SPSW-002XE16EU']
    }
  }

}

module.exports = ShellyPro2CloudDriver;
