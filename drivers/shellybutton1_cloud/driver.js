'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellyButton1CloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly Button 1 Cloud',
      battery: true,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shellybutton1-', 'shellybutton2-'],
      type: ['SHBTN-1', 'SHBTN-2']
    }
  }

}

module.exports = ShellyButton1CloudDriver;
