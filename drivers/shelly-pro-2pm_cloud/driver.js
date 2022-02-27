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
      hostname: ['shellypro2pm-', 'ShellyPro2PM-'],
      type: ['SPSW-002PE16EU'],
      channels: 2,
      capabilities_1: [
        "onoff",
        "measure_power",
        "meter_power",
        "measure_voltage",
        "measure_current",
        "measure_temperature",
        "input_1",
        "rssi"
      ],
      capabilities_2: [
        "onoff",
        "measure_power",
        "meter_power",
        "measure_voltage",
        "measure_current",
        "measure_temperature",
        "input_1"
      ]
    }
  }

}

module.exports = ShellyPro2PMCloudDriver;
