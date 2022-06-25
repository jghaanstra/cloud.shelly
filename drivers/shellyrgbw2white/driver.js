'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyRGBW2WhiteDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly RGBW2 White',
      battery: false,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shellyrgbw2-'],
      type: ['SHRGBW2'],
      channels: 4,
      capabilities_1: [
        "onoff",
        "dim",
        "measure_power",
        "measure_power.total",
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

module.exports = ShellyRGBW2WhiteDriver;
