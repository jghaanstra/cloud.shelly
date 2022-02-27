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

      // TODO: REMOVE THIS AFTER SOME RELEASES
      // migrate settings
      if (this.getSetting('server_address') && (this.getSetting('cloud_server') == null || this.getSetting('cloud_server') == undefined)) {
        this.setSettings({cloud_server: this.getSetting('server_address')});
      }

      // TODO: REMOVE THIS AFTER SOME RELEASES
      if (this.getStoreValue('channel') !== 0 && this.hasCapability('rssi')) {
        this.removeCapability('rssi');
      }

      // TODO: REMOVE THIS AFTER SOME RELEASES
      // MIGRATING INTEGRATOR CLOUD DEVICES TO OAUTH2 CLOUD DEVICES
      if (this.getStoreValue('OAuth2ConfigId') == null) {
        throw new Error(this.homey.__('device.oauth2_repairing'));
      }

      // MAKE SURE THERE IS A VALID OAUTH2CLIENT (ALSO FOR OPENING A WEBSOCKET BASED ON getFirstSavedOAuth2Client)
      this.oAuth2Client = this.homey.app.getOAuth2Client({
        sessionId: this.getStoreValue('OAuth2SessionId'),
        configId: this.getStoreValue('OAuth2ConfigId'),
      });

      // update initial device status on init
      this.homey.setTimeout(async () => {
        const device_data = await this.oAuth2Client.getCloudDevices(this.getSetting('cloud_server'));
        const device_id = this.getSetting('cloud_device_id').toString(16);
        if (this.getStoreValue('gen') === 'gen1') {
          this.parseStatusUpdate(device_data.data.devices_status[device_id])
        } else if (this.getStoreValue('gen') === 'gen2') {
          this.parseStatusUpdateGen2(device_data.data.devices_status[device_id])
        }
      }, this.util.getRandomTimeout(10));
    } catch (error) {
      this.setUnavailable(error);
      this.log(error);
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
      this.log(error);
    }
  }

  async onOAuth2Deleted() {
    try {
      await this.homey.app.updateShellyCollection();
      await this.util.sleep(2000);
      return await this.homey.app.websocketClose();
    } catch (error) {
      this.log(error);
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

module.exports = ShellyCloudDevice;
