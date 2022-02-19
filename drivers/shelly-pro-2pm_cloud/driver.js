'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyPro2PMCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Pro 2PM Relay Cloud',
      battery: false,
      gen: 'gen2',
      communication: 'cloud',
      hostname: ['ShellyPro2PM-'],
      type: ['SPSW-002PE16EU']
    }
  }

}

module.exports = ShellyPro2PMCloudDriver;
