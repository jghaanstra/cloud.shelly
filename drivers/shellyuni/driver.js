'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellyUniDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Uni',
      battery: false,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shellyuni-'],
      type: ['SHUNI-1'],
      channels: 2,
      capabilities_1: [
        "onoff",
        "measure_voltage",
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

module.exports = ShellyUniDriver;
