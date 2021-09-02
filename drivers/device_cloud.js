'use strict';

const Homey = require('homey');
const Device = require('./device.js');
const Util = require('../lib/util.js');
const WebSocket = require('ws');
const tinycolor = require("tinycolor2");

class ShellyCloudDevice extends Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});
  }

}

module.exports = ShellyCloudDevice;
