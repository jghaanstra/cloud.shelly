'use strict';

const Homey = require('homey');
const Device = require('./device.js');
const { OAuth2Device } = require('homey-oauth2app');
const Util = require('../lib/util.js');

class ShellyCloudDevice extends OAuth2Device {

  async onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});
  }

  async bootSequence() {

    // update initial device status on init
    this.homey.setTimeout(async () => {
      await this.util.sleep(3000);
      const device_data = await this.oAuth2Client.getCloudDevices(this.getSetting('cloud_server'));
      if (this.getStoreValue('gen') === 'gen1') {
        this.parseStatusUpdate(device_data.data.devices_status[this.getData().id])
      } else if (this.getStoreValue('gen') === 'gen2') {
        this.parseStatusUpdateGen2(device_data.data.devices_status[this.getData().id])
      }
    }, 6000);

  }

  async onAdded() {

    // update device collection and start cloud websocket listener (if needed)
    if (this.getStoreValue('channel') === 0) {
      this.homey.setTimeout(async () => {
        await this.homey.app.updateShellyCollection();
        await this.util.sleep(2000);
        this.homey.app.websocketCloudListener();
        return;
      }, 1000);
    }

  }

  async onDeleted() {
    try {
      return await this.homey.app.updateShellyCollection();
    } catch (error) {
      this.log(error);
    }
  }

}

ShellyCloudDevice.prototype.updateCapabilityValue = Device.prototype.updateCapabilityValue;
ShellyCloudDevice.prototype.parseStatusUpdate = Device.prototype.parseStatusUpdate;
ShellyCloudDevice.prototype.parseStatusUpdateGen2 = Device.prototype.parseStatusUpdateGen2;
ShellyCloudDevice.prototype.parseCapabilityUpdate = Device.prototype.parseCapabilityUpdate;

// TODO: also map capability listeners?

module.exports = ShellyCloudDevice;
