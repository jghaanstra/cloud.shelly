'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyPro1PMCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Pro 1PM Cloud',
      battery: false,
      gen: 'gen2',
      communication: 'cloud',
      hostname: ['ShellyPro1PM-'],
      type: ['SPSW-001PE16EU']
    }
  }

}

module.exports = ShellyPro1PMCloudDriver;
