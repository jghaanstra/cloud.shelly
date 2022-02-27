'use strict';

const Homey = require('homey');
const Driver = require('../driver.js');
const Util = require('../../lib/util.js');

class ShellydwDriver extends Driver {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});

    this.config = {
      name: 'Shelly DW',
      battery: true,
      gen: 'gen1',
      communication: 'coap',
      hostname: ['shellydw-'],
      type: ['SHDW-1', 'SHDW-2'],
      channels: 1
    }
  }

}

module.exports = ShellydwDriver;
