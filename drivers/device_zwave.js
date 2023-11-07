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
      if (typeof this.resetMeter === 'function') return this.resetMeter();
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

  async customSaveMessage(oldSettings, newSettings, changedKeys = []) {
    try {
      if (changedKeys.includes('zwaveShutterOperatingMode')) {
        return this.homey.__('settings.re_pair_required');
      }
    } catch (error) {
      this.error(error)
    }
  }

  /**
   * Method that checks the multi channel nodes of the device and will return the multi channel node id of the found
   * endpoint that supports the basic device controls.
   * @returns {*}
   */
  findRootDeviceEndpoint() {
    try {
      if (this.numberOfMultiChannelNodes === 0) return null;
      const { rootDeviceClassGeneric } = this;
      for (const i in this.node.MultiChannelNodes) {
        if (this.node.MultiChannelNodes[i].deviceClassGeneric === 'GENERIC_TYPE_SWITCH_BINARY'
          || this.node.MultiChannelNodes[i].deviceClassGeneric === 'GENERIC_TYPE_SWITCH_MULTILEVEL'
          || (typeof rootDeviceClassGeneric === 'string'
            && this.node.MultiChannelNodes[i].deviceClassGeneric === rootDeviceClassGeneric)) {
          return Number(i);
        }
      }
      return null;
    } catch (error) {
      this.error(error);
    }
  }

  /**
   * Method that resets the accumulated power meter value on the node. It tries to find the root node of the device
   * and then looks for the COMMAND_CLASS_METER.
   * @returns {*}
   */
  async resetMeter({ multiChannelNodeId } = {}) {
    try {
      const multiChannelRootNodeId = multiChannelNodeId || this.findRootDeviceEndpoint();
      if (typeof multiChannelRootNodeId === 'number') {

        let commandClassMeter = null;
        commandClassMeter = this.getCommandClass('METER', { multiChannelRootNodeId });

        if (commandClassMeter && commandClassMeter.hasOwnProperty('METER_RESET')) {
          await commandClassMeter.METER_RESET({}).catch(this.error);
          if (this.hasCapability('meter_power')) {
            await this.setCapabilityValue('meter_power', 0);
          }
        }

        // TODO: this requires a fix in node-homey-zwavedriver
        // return this.meterReset({ multiChannelNodeId: multiChannelRootNodeId })
        //   .then(async res => {
        //     if (this.hasCapability('meter_power')) {
        //       await this.setCapabilityValue('meter_power', 0);
        //     }
        //     return res;
        //   });
      }
      let commandClassMeterMain = null;
      commandClassMeterMain = this.getCommandClass('METER');

      if (commandClassMeterMain && commandClassMeterMain.hasOwnProperty('METER_RESET')) {
        await commandClassMeterMain.METER_RESET({}).catch(this.error);
        if (this.hasCapability('meter_power')) {
          await this.setCapabilityValue('meter_power', 0);
        }
      }

      // TODO: this requires a fix in node-homey-zwavedriver
      // return this.meterReset()
      //   .then(async res => {
      //     if (this.hasCapability('meter_power')) {
      //       await this.setCapabilityValue('meter_power', 0);
      //     }
      //     return res;
      //   });
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

}

module.exports = ShellyZwaveDevice;