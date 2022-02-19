'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class Shelly4ProCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Pro 4PM Cloud',
      battery: false,
      gen: 'gen2',
      communication: 'cloud',
      hostname: ['shelly4pro-', 'shellypro4pm-', 'ShellyPro4PM-'],
      type: ['SPSW-004PE16EU']
    }
  }

}

module.exports = Shelly4ProCloudDriver;
