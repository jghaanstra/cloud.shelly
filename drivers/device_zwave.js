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
      
      await super.onSettings(oldSettings, newSettings, changedKeys);

      changedKeys.forEach(async (key) => {
        
          // Wave Shutter: add / remove windowcoverings_tilt_set based on venetian operating mode
          if (key === 'zwaveShutterOperatingMode') {
            if (newSettings.zwaveShutterOperatingMode !== 0 && !this.hasCapability('windowcoverings_tilt_set')) {
              await this.addCapability('windowcoverings_tilt_set');
              this.registerCapability('windowcoverings_tilt_set', 'SWITCH_MULTILEVEL');
            } else if (newSettings.zwaveShutterOperatingMode === 0 && this.hasCapability('windowcoverings_tilt_set')) {
              await this.removeCapability('windowcoverings_tilt_set');
            }
          }

      });

    } catch (error) {
      this.log(error);
    }
  }

}

module.exports = ShellyZwaveDevice;