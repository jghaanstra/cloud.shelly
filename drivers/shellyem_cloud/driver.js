'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyEmCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly EM Cloud',
      battery: false,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shellyem-'],
      type: ['SHEM'],
      channels: 2,
      capabilities_1: [
        "onoff",
        "measure_power",
        "measure_voltage",
        "meter_power",
        "meter_power_returned",
        "rssi"
      ],
      capabilities_2: [
        "onoff",
        "measure_power",
        "measure_voltage",
        "meter_power",
        "meter_power_returned"
      ]
    }
  }

}

module.exports = ShellyEmCloudDriver;
