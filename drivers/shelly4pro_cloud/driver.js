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
      type: ['SPSW-004PE16EU'],
      channels: 4,
      capabilities_1: [
        "onoff",
        "measure_power",
        "meter_power",
        "measure_voltage",
        "input_1",
        "measure_temperature",
        "rssi"
      ],
      capabilities_2: [
        "onoff",
        "measure_power",
        "meter_power",
        "measure_voltage",
        "input_1"
      ]
    }
  }

}

module.exports = Shelly4ProCloudDriver;
