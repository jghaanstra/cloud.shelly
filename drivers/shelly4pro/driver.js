'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class Shelly4ProDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Pro 4PM',
      battery: false,
      gen: 'gen2',
      communication: 'websocket',
      hostname: ['shelly4pro-', 'shellypro4pm-', 'ShellyPro4PM-'],
      type: ['SPSW-004PE16EU']
    }
  }

}

module.exports = Shelly4ProDriver;
