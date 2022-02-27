'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class Shelly25CloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly 2.5 Relay Cloud',
      battery: false,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shellyswitch25-'],
      type: ['SHSW-25'],
      channels: 2,
      capabilities_1: [
        "onoff",
        "measure_power",
        "meter_power",
        "measure_temperature",
        "input_1",
        "rssi"
      ],
      capabilities_2: [
        "onoff",
        "measure_power",
        "meter_power",
        "input_1"
      ]
    }
  }

}

module.exports = Shelly25CloudDriver;
