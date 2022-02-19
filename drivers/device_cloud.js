'use strict';

const Homey = require('homey');
const Device = require('./device.js');
const { OAuth2Device } = require('homey-oauth2app');
const Util = require('../lib/util.js');

class ShellyCloudDevice extends OAuth2Device {

  async onOAuth2Init() {
    if (!this.util) this.util = new Util({homey: this.homey});

    // make sure the device is registered and allow cloud websocket with refreshed token
    this.oAuth2Client.registerDevice();
  }

  async bootSequence() {

    // update initial device status on init
    this.homey.setTimeout(async () => {
      const device_data = await this.oAuth2Client.getCloudDevices(this.getSetting('cloud_server'));
      if (this.getStoreValue('gen') === 'gen1') {
        this.parseStatusUpdate(device_data.data.devices_status[this.getData().id])
      } else if (this.getStoreValue('gen') === 'gen2') {
        this.parseStatusUpdateGen2(device_data.data.devices_status[this.getData().id])
      }
    }, this.util.getRandomTimeout(10));

  }

  async onOAuth2Added() {

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

  async onOAuth2Deleted() {
    try {
      return await this.homey.app.updateShellyCollection();
    } catch (error) {
      this.log(error);
    }
  }

  async onOAuth2Uninit() {
    this.oAuth2Client.unregisterDevice();
  }

}

ShellyCloudDevice.prototype.updateCapabilityValue = Device.prototype.updateCapabilityValue;
ShellyCloudDevice.prototype.parseStatusUpdate = Device.prototype.parseStatusUpdate;
ShellyCloudDevice.prototype.parseStatusUpdateGen2 = Device.prototype.parseStatusUpdateGen2;
ShellyCloudDevice.prototype.parseCapabilityUpdate = Device.prototype.parseCapabilityUpdate;
ShellyCloudDevice.prototype.onCapabilityOnoff = Device.prototype.onCapabilityOnoff;
ShellyCloudDevice.prototype.onCapabilityOnoffLight = Device.prototype.onCapabilityOnoffLight;
ShellyCloudDevice.prototype.onCapabilityWindowcoveringsState = Device.prototype.onCapabilityWindowcoveringsState;
ShellyCloudDevice.prototype.onCapabilityWindowcoveringsSet = Device.prototype.onCapabilityWindowcoveringsSet;
ShellyCloudDevice.prototype.onCapabilityDim = Device.prototype.onCapabilityDim;
ShellyCloudDevice.prototype.onCapabilityLightTemperature = Device.prototype.onCapabilityLightTemperature;
ShellyCloudDevice.prototype.onCapabilityValvePosition = Device.prototype.onCapabilityValvePosition;
ShellyCloudDevice.prototype.onCapabilityValveMode = Device.prototype.onCapabilityValveMode;
ShellyCloudDevice.prototype.onCapabilityTargetTemperature = Device.prototype.onCapabilityTargetTemperature;

module.exports = ShellyCloudDevice;
