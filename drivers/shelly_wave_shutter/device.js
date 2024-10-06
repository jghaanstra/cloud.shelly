'use strict';

const Device = require('../device_zwave.js');

class ShellyWaveShutterDevice extends Device {

  async registerCapabilities() {
    try {
      
      this.registerCapability('measure_power', 'METER');

      this.registerCapability('meter_power', 'METER');

      this.registerCapability('windowcoverings_set', 'SWITCH_MULTILEVEL', { multiChannelNodeId: 1 });

      const zwaveShutterOperatingModeRaw = await this.configurationGet({index: 71});
      const zwaveShutterOperatingModeArray = Array.from(zwaveShutterOperatingModeRaw['Configuration Value']);
      const zwaveShutterOperatingMode = zwaveShutterOperatingModeArray[0];

      if (Number(zwaveShutterOperatingMode) === 1) { // operating mode = venetian blinds
        if (!this.hasCapability('windowcoverings_tilt_set')) { await this.addCapability('windowcoverings_tilt_set'); }
        this.registerCapability('windowcoverings_tilt_set', 'SWITCH_MULTILEVEL', { multiChannelNodeId: 2 });
      }

    } catch (error) {
      this.error(error);
    }    
  }

  async onSettings({oldSettings, newSettings, changedKeys}) {
    try {
      if (changedKeys.includes("zwaveShutterOperatingMode")) {
        if (Number(newSettings.zwaveShutterOperatingMode) === 1) { // operating mode = venetian blinds
          if (!this.hasCapability('windowcoverings_tilt_set')) { await this.addCapability('windowcoverings_tilt_set'); }
          this.registerCapability('windowcoverings_tilt_set', 'SWITCH_MULTILEVEL', { multiChannelNodeId: 2 });
        } else {
          if (this.hasCapability('windowcoverings_tilt_set')) { await this.removeCapability('windowcoverings_tilt_set'); }
        }
      }
      return await super.onSettings({oldSettings, newSettings, changedKeys});
    } catch (error) {
      this.error(error);
    }
  }

}

module.exports = ShellyWaveShutterDevice;