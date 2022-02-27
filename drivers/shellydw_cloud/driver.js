'use strict';

const Homey = require('homey');
const Driver = require('../driver_cloud.js');
const Util = require('../../lib/util.js');

class ShellydwCloudDriver extends Driver {

  onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly DW',
      battery: true,
      gen: 'gen1',
      communication: 'cloud',
      hostname: ['shellydw-'],
      type: ['SHDW-1', 'SHDW-2'],
      channels: 1
    }
  }

}

module.exports = ShellydwCloudDriver;
