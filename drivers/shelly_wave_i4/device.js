'use strict';

const Device = require('../device_zwave.js');

class ShellyWavei4Device extends Device {

  async registerCapabilities() {
    try {

      this.registerCapability('input_1', 'SWITCH_BINARY', {
        multiChannelNodeId: 2,
        get: 'SWITCH_BINARY_GET',
        set: 'SWITCH_BINARY_SET',
        getOpts: {
          getOnStart: true,
        },
        setParserV2(value, options) {
          const duration = options.hasOwnProperty('duration')
            ? util.calculateZwaveDimDuration(options.duration)
            : FACTORY_DEFAULT_DIMMING_DURATION;
          return {
            'Target Value': value ? 'on/enable' : 'off/disable',
            Duration: duration,
          };
        },
        report: 'SWITCH_BINARY_REPORT',
        reportParserV2: report => {
          if (report && report.hasOwnProperty('Current Value')) {
            if (report['Current Value'] === 'on/enable') return true;
            if (report['Current Value'] === 'off/disable') return false;
          }
          return null;
        },
      });
      this.registerCapability('input_2', 'SWITCH_BINARY', {
        multiChannelNodeId: 3,
        get: 'SWITCH_BINARY_GET',
        set: 'SWITCH_BINARY_SET',
        getOpts: {
          getOnStart: true,
        },
        setParserV2(value, options) {
          const duration = options.hasOwnProperty('duration')
            ? util.calculateZwaveDimDuration(options.duration)
            : FACTORY_DEFAULT_DIMMING_DURATION;
          return {
            'Target Value': value ? 'on/enable' : 'off/disable',
            Duration: duration,
          };
        },
        report: 'SWITCH_BINARY_REPORT',
        reportParserV2: report => {
          if (report && report.hasOwnProperty('Current Value')) {
            if (report['Current Value'] === 'on/enable') return true;
            if (report['Current Value'] === 'off/disable') return false;
          }
          return null;
        },
      });
      this.registerCapability('input_3', 'SWITCH_BINARY', {
        multiChannelNodeId: 4,
        get: 'SWITCH_BINARY_GET',
        set: 'SWITCH_BINARY_SET',
        getOpts: {
          getOnStart: true,
        },
        setParserV2(value, options) {
          const duration = options.hasOwnProperty('duration')
            ? util.calculateZwaveDimDuration(options.duration)
            : FACTORY_DEFAULT_DIMMING_DURATION;
          return {
            'Target Value': value ? 'on/enable' : 'off/disable',
            Duration: duration,
          };
        },
        report: 'SWITCH_BINARY_REPORT',
        reportParserV2: report => {
          if (report && report.hasOwnProperty('Current Value')) {
            if (report['Current Value'] === 'on/enable') return true;
            if (report['Current Value'] === 'off/disable') return false;
          }
          return null;
        },
      });
      this.registerCapability('input_4', 'SWITCH_BINARY', {
        multiChannelNodeId: 5,
        get: 'SWITCH_BINARY_GET',
        set: 'SWITCH_BINARY_SET',
        getOpts: {
          getOnStart: true,
        },
        setParserV2(value, options) {
          const duration = options.hasOwnProperty('duration')
            ? util.calculateZwaveDimDuration(options.duration)
            : FACTORY_DEFAULT_DIMMING_DURATION;
          return {
            'Target Value': value ? 'on/enable' : 'off/disable',
            Duration: duration,
          };
        },
        report: 'SWITCH_BINARY_REPORT',
        reportParserV2: report => {
          if (report && report.hasOwnProperty('Current Value')) {
            if (report['Current Value'] === 'on/enable') return true;
            if (report['Current Value'] === 'off/disable') return false;
          }
          return null;
        },
      });

      this.registerReportListener('CENTRAL_SCENE', 'CENTRAL_SCENE_NOTIFICATION', report => {
        const action_event = this.util.getActionEventDescription(report.Properties1['Key Attributes'], 'zwave') + '_' + report['Scene Number'];
        this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": action_event}, {"action": action_event}).catch(error => { this.error(error) });
      });

      // input_1
      this.registerMultiChannelReportListener(2, 'SWITCH_BINARY', 'SWITCH_BINARY_REPORT', async report => {
        this.homey.flow.getDeviceTriggerCard('triggerInput1Changed').trigger(this, {}, {}).catch(error => { this.error(error) });
        if (report['Target Value'] === 'on/enable') {
          this.homey.flow.getDeviceTriggerCard('triggerInput1On').trigger(this, {}, {}).catch(error => { this.error(error) });
        } else {
          this.homey.flow.getDeviceTriggerCard('triggerInput1Off').trigger(this, {}, {}).catch(error => { this.error(error) });
        }
      });

      // input_2
      this.registerMultiChannelReportListener(3, 'SWITCH_BINARY', 'SWITCH_BINARY_REPORT', async report => {
        this.homey.flow.getDeviceTriggerCard('triggerInput2Changed').trigger(this, {}, {}).catch(error => { this.error(error) });
        if (report['Target Value'] === 'on/enable') {
          this.homey.flow.getDeviceTriggerCard('triggerInput2On').trigger(this, {}, {}).catch(error => { this.error(error) });
        } else {
          this.homey.flow.getDeviceTriggerCard('triggerInput2Off').trigger(this, {}, {}).catch(error => { this.error(error) });
        }
      });

      // input_3
      this.registerMultiChannelReportListener(4, 'SWITCH_BINARY', 'SWITCH_BINARY_REPORT', async report => {
        this.homey.flow.getDeviceTriggerCard('triggerInput3Changed').trigger(this, {}, {}).catch(error => { this.error(error) });
        if (report['Target Value'] === 'on/enable') {
          this.homey.flow.getDeviceTriggerCard('triggerInput3On').trigger(this, {}, {}).catch(error => { this.error(error) });
        } else {
          this.homey.flow.getDeviceTriggerCard('triggerInput3Off').trigger(this, {}, {}).catch(error => { this.error(error) });
        }
      });

      // input_4
      this.registerMultiChannelReportListener(5, 'SWITCH_BINARY', 'SWITCH_BINARY_REPORT', async report => {
        this.homey.flow.getDeviceTriggerCard('triggerInput4Changed').trigger(this, {}, {}).catch(error => { this.error(error) });
        if (report['Target Value'] === 'on/enable') {
          this.homey.flow.getDeviceTriggerCard('triggerInput4On').trigger(this, {}, {}).catch(error => { this.error(error) });
        } else {
          this.homey.flow.getDeviceTriggerCard('triggerInput4Off').trigger(this, {}, {}).catch(error => { this.error(error) });
        }
      });

    } catch (error) {
      this.error(error);
    }    
  }

}

module.exports = ShellyWavei4Device;