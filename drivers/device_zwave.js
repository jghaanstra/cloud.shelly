'use strict';

const {ZwaveDevice} = require('homey-zwavedriver');
const Util = require('../lib/util.js');

class ShellyZwaveDevice extends ZwaveDevice {

  async onNodeInit({ node }) {
    try {

      if (!this.util) this.util = new Util({homey: this.homey});

      // Mark device as unavailable while configuring
      await this.setUnavailable('Device is being configured ...');

      // Get number of multi channel nodes
      this.numberOfMultiChannelNodes = Object.keys(this.node.MultiChannelNodes || {}).length;

      /* update device config */
      await this.updateDeviceConfig();

      /* register device trigger cards */
      let triggers = [];
      if (this.getStoreValue('config').triggers !== undefined) {
        triggers = this.getStoreValue('config').triggers
      } else if (this.getStoreValue('channel') !== 0) {
        triggers = this.getStoreValue('config').triggers_2
      } else {
        triggers = this.getStoreValue('config').triggers_1
      }
      for (const trigger of triggers) {
        this.homey.flow.getDeviceTriggerCard(trigger);
      }

      // Register the device capabilities from the device driver
      await this.registerCapabilities();

      // Listen for reset_meter maintenance action of devices with meter_power capability
      if (this.hasCapability('button.reset_meter')) {
        this.registerCapabilityListener('button.reset_meter', this._onMaintenanceResetMeter.bind(this));
      }

      // Listen for calibration maintenance action for Wave Shutter
      this.registerCapabilityListener('button.calibration', this._onCalibrationHandler.bind(this));

      // Device is ready to be used, mark as available
      await this.setAvailable();

    } catch (error) {
      this.error(error);
    }
  }

  // MAINTENANCE LISTENERS

  /* Reset meter_power */
  async _onMaintenanceResetMeter() {
    try {
      this.log('starting reset meter ...');
      if (typeof this.meterReset === 'function') return this.meterReset();
      this.error('Reset meter failed');
      throw new Error('Reset meter not supported');
    } catch (error) {
      this.error(error);
    }
  }

  /**
   * Calibration for Wave Shutter. Set calibration configuration parameter 78 to 1 and back to 0 after CALBRATION_RESET_TIMEOUT.
   */
  async _onCalibrationHandler() {
    try {
      this.log('starting calibration ...');

      // If calibration is started before it was properly reset
      if (this._calibrationResetTimeout) {
        // Reset calibration process
        await this._resetCalibrationProcess();

        // Short delay to not confuse the device
        await sleep(500);
      }

      // Start calibration
      await this.configurationSet({
        index: 78,
        size: 1,
      }, 1);

      // Reset the calibration setting after CALBRATION_RESET_TIMEOUT
      this._calibrationResetTimeout = this.homey.setTimeout(this._resetCalibrationProcess.bind(this), 90000);
    } catch (error) {
      this.error(error);
    }
  }

  // SETTINGS

  async onSettings({oldSettings, newSettings, changedKeys}) {
    try {
      this.log('newSettings:', JSON.stringify(newSettings));
      return await super.onSettings({oldSettings, newSettings, changedKeys});
    } catch (error) {
      this.error(error);
    }
  }

  // HELPER FUNCTIONS

  /**
   * Reset calibration configuration parameter and abort running timeout.
   */
  async _resetCalibrationProcess() {
    this.log('reset calibration process ...');

    // Clear timeout and reset calibration setting
    this.homey.clearTimeout(this._calibrationResetTimeout);
    this._calibrationResetTimeout = null;

    // Reset calibration setting
    await this.configurationSet({
      index: 78,
      size: 1,
    }, 0);
  }

  async updateDeviceConfig() {
    try {

      // Make sure the device is recognised as Zwave device
      await this.setStoreValue('communication', 'zwave');
      await this.setStoreValue('gen', 'zwave');

      // Set the right channel for the device
      const device_channel = this.node.isMultiChannelNode ? this.node.multiChannelNodeId : 0;
      await this.setStoreValue('channel', device_channel);

      // Update the device config
      const device_config = this.util.getDeviceConfig(this.driver.manifest.name.en, 'name');

      if (typeof device_config !== 'undefined') {

        /* updating device config store value */
        await this.setStoreValue('config', device_config);

        /* set some device values */
        await this.setStoreValue('battery', device_config.battery);
        await this.setStoreValue('type', this.driver.manifest.zwave.productId[0]);
        await this.setStoreValue('main_device', this.getData().token);

        /* set device class if changed */
        if (this.getClass() !== device_config.class) {
          this.log('Updating device class from', this.getClass(), 'to', device_config.class);
          this.setClass(device_config.class)
        }

        /* add any missing capabilities to the device based on device config */
        if (this.getStoreValue('channel') === 0) {
          device_config.capabilities_1.forEach(async (capability) => {
            if(!this.hasCapability(capability) && !['input_1', 'input_2', 'input_3', 'input_4'].includes(capability)) {
              this.log('Adding capability', capability, 'to', this.getName(), 'upon device init as the device does not have it already but its added in the device config.');
              await this.addCapability(capability).catch(this.error);
            }
          });
        } else {
          device_config.capabilities_2.forEach(async (capability) => {
            if(!this.hasCapability(capability) && !['input_1', 'input_2', 'input_3', 'input_4'].includes(capability)) {
              this.log('Adding capability', capability, 'to', this.getName(), 'upon device init as the device does not have it already but its added in the device config.');
              await this.addCapability(capability).catch(this.error);
            }
          });
        }

      }

      return Promise.resolve(true);

    } catch (error) {
      return Promise.reject(error);
    }

  }

}

module.exports = ShellyZwaveDevice;