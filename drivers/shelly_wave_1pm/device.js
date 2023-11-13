'use strict';

const Device = require('../device_zwave.js');

class ShellyWave1PMDevice extends Device {

  async registerCapabilities() {
    try {

      this.registerCapability('onoff', 'SWITCH_BINARY');
      
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

    } catch (error) {
      this.error(error);
    }
  }

}

module.exports = ShellyWave1PMDevice;