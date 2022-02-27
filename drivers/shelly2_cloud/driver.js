'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class Shelly2CloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 2 Relay Cloud',
      battery: false,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shelly2-'],
      type: ['SHSW-21'],
      channels: 2,
      capabilities_1: [
        "onoff",
        "measure_power",
        "meter_power",
        "input_1",
        "rssi"
      ],
      capabilities_2: [
        "onoff",
        "input_1"
      ]
    }
  }

}

module.exports = Shelly2CloudDriver;
