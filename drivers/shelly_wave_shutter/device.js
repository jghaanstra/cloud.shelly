'use strict';

const Device = require('../device_zwave.js');

class ShellyWaveShutterDevice extends Device {

  async registerCapabilities() {
    try {

      // TODO: remove on the next release
      if (!this.hasCapability('button.reset_meter')) {
        await this.addCapability('button.reset_meter').catch(err => this.error(`Error adding ${'button.reset_meter'} capability`, err));
      }
      if (!this.hasCapability('button.calibration')) {
        await this.addCapability('button.calibration').catch(err => this.error(`Error adding ${'button.calibration'} capability`, err));
      }
      if (!this.hasCapability('windowcoverings_state')) {
        await this.addCapability('windowcoverings_state').catch(err => this.error(`Error adding ${'windowcoverings_state'} capability`, err));
      }
    
      this.registerCapability('measure_power', 'METER', {
        reportParserOverride: true,
        reportParser: report => {
          if (
            report
            && report.hasOwnProperty('Meter Type')
            && report['Meter Type'] === 33
            && report.hasOwnProperty('Properties1')
            && report.Properties1.hasOwnProperty('Scale')
            && report.Properties1.Scale === 2
          ) {
            return report['Meter Value (Parsed)'];
          }
          return null;
        },
      });

      this.registerCapability('meter_power', 'METER', {
        reportParserOverride: true,
        reportParser: report => {
          if (
            report
            && report.hasOwnProperty('Meter Type')
            && report['Meter Type'] === 33
            && report.hasOwnProperty('Properties1')
            && report.Properties1.hasOwnProperty('Scale')
            && report.Properties1.Scale === 0
          ) {
            return report['Meter Value (Parsed)'];
          }
          return null;
        },
      });

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