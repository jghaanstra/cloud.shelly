'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyPro2PMCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Pro 2PM Cloud',
      battery: false,
      hostname: ['ShellyPro2PM-'],
      code: ['SPSW-002PE16EU']
    }
  }

}

module.exports = ShellyPro2PMCloudDriver;
