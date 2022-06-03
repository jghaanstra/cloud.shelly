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
    try {

      // initially set the device as available
      this.homey.setTimeout(async () => {
        this.setAvailable();
      }, 1000);

      // make sure there is a valid oauth2client (also for opening a websocket based on getFirstSavedOAuth2Client() )
      if (this.getStoreValue('OAuth2ConfigId') !== null) {
        this.oAuth2Client = this.homey.app.getOAuth2Client({
          sessionId: this.getStoreValue('OAuth2SessionId'),
          configId: this.getStoreValue('OAuth2ConfigId'),
        });
      }

      // update initial device status on init
      this.homey.setTimeout(async () => {
        try {
          if (this.getSetting('cloud_server') === null) throw "No valid cloud server address found, skipping initial device update.";
          const device_data = await this.oAuth2Client.getCloudDevices(this.getSetting('cloud_server'));
          const device_id = this.getSetting('cloud_device_id').toString(16);
          if (this.getStoreValue('gen') === 'gen1') {
            this.parseStatusUpdate(device_data.data.devices_status[device_id])
          } else if (this.getStoreValue('gen') === 'gen2') {
            this.parseStatusUpdateGen2(device_data.data.devices_status[device_id])
          }
          this.homey.app.websocketCloudListener();
        } catch (error) {
          this.error(error);
        }
      }, this.util.getRandomTimeout(10));
    } catch (error) {
      this.error(error);
    }
  }

  async onOAuth2Added() {
    try {
      // update device collection and start cloud websocket listener (if needed)
      if (this.getStoreValue('channel') === 0) {
        this.homey.setTimeout(async () => {
          await this.homey.app.updateShellyCollection();
          await this.util.sleep(2000);
          this.homey.app.websocketCloudListener();
          return;
        }, 1000);
      }
    } catch (error) {
      this.error(error);
    }
  }

  async onOAuth2Deleted() {
    try {
      await this.homey.app.updateShellyCollection();
      await this.util.sleep(2000);
      return await this.homey.app.websocketClose();
    } catch (error) {
      this.error(error);
    }
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
ShellyCloudDevice.prototype.updateDeviceRgb = Device.prototype.updateDeviceRgb;
ShellyCloudDevice.prototype.rollerState = Device.prototype.rollerState;

module.exports = ShellyCloudDevice;
