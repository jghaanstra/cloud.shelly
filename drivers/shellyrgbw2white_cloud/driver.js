'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyRGBW2WhiteCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly RGBW2 White Cloud',
      battery: false,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shellyrgbw2-'],
      type: ['SHRGBW2'],
      channels: 4,
      capabilities_1: [
        "onoff",
        "dim",
        "measure_power",
        "meter_power",
        "input_1",
        "rssi"
      ],
      capabilities_2: [
        "onoff",
        "dim",
        "measure_power",
        "meter_power",
        "input_1"
      ]
    }
  }

}

module.exports = ShellyRGBW2WhiteCloudDriver;
