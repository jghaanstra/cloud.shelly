'use strict';
;
const {ZwaveDevice} = require('homey-zwavedriver');

class ShellyZwaveDevice extends ZwaveDevice {

  async onNodeInit({ node }) {
    try {

      // Mark device as unavailable while configuring
      await this.setUnavailable('Device is being configured ...');

      // Make sure the device is recognised as a zwave device in the rest of the app
      await this.setStoreValue('communication', 'zwave');

      // Get number of multi channel nodes
      this.numberOfMultiChannelNodes = Object.keys(this.node.MultiChannelNodes || {}).length;

      // Register the device capabilities from the device driver
      await this.registerCapabilities();

      // Device is ready to be used, mark as available
      await this.setAvailable();

    } catch (error) {
      this.error(error);
    }
  }

  async onSettings({oldSettings, newSettings, changedKeys}) {
    try {
      this.log('newSettings:', JSON.stringify(newSettings));
      return await super.onSettings({oldSettings, newSettings, changedKeys});
    } catch (error) {
      this.log(error);
    }
  }

  async customSaveMessage({oldSettings, newSettings, changedKeys}) {
    if (changedKeys.includes('zwaveShutterOperatingMode')) {
      return this.homey.__('settings.re_pair_required');
    }
  }

}

module.exports = ShellyZwaveDevice;