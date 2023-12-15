'use strict';

const Device = require('../device_zwave.js');

class ShellyWaveShutterDevice extends Device {

  async registerCapabilities() {
    try {
      
      this.registerCapability('measure_power', 'METER');

      this.registerCapability('meter_power', 'METER');

      this.registerCapability('windowcoverings_state', 'SWITCH_BINARY');

      // configure capabilities based on operating mode (classic shutter vs venetian blinds)
      if (this.numberOfMultiChannelNodes > 0) { // operating mode = venetian blinds
        const windowCoveringsSetMultiChannelNodeIds = this.getMultiChannelNodeIdsByDeviceClassGeneric('GENERIC_TYPE_SWITCH_MULTILEVEL');
        this.registerCapability('windowcoverings_set', 'SWITCH_MULTILEVEL', { multiChannelNodeId: windowCoveringsSetMultiChannelNodeIds[0] });
        if (windowCoveringsSetMultiChannelNodeIds.length > 1) {
          this.registerCapability('windowcoverings_tilt_set', 'SWITCH_MULTILEVEL', { multiChannelNodeId: windowCoveringsSetMultiChannelNodeIds[1] });
        } else if (windowCoveringsSetMultiChannelNodeIds.length <= 1 && this.hasCapability('windowcoverings_tilt_set')) {
          await this.removeCapability('windowcoverings_tilt_set');
        }
      } else { // operating mode = classic shutter
        if (this.hasCapability('windowcoverings_tilt_set')) {
          await this.removeCapability('windowcoverings_tilt_set');
        }
        this.registerCapability('windowcoverings_set', 'SWITCH_MULTILEVEL');
      }

    } catch (error) {
      this.error(error);
    }    
  }

}

module.exports = ShellyWaveShutterDevice;