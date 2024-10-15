'use strict';

const Device = require('../device_zwave.js');

class ShellyWaveProDimmer1PMDevice extends Device {

  async registerCapabilities() {
    try {

      this.registerCapability('dim', 'SWITCH_MULTILEVEL');
      
      this.registerCapability('measure_power', 'METER');

      this.registerCapability('meter_power', 'METER');

      // for detached mode
      this.registerReportListener('CENTRAL_SCENE', 'CENTRAL_SCENE_NOTIFICATION', report => {
        const action_event = this.util.getActionEventDescription(report.Properties1['Key Attributes'], 'zwave') + '_' + report['Scene Number'];
        this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": action_event}, {"action": action_event}).catch(error => { this.error(error) });
      });

      const zwaveDetachedModeO1Raw = await this.configurationGet({index: 7});
      const zwaveDetachedModeO1Array = Array.from(zwaveDetachedModeO1Raw['Configuration Value']);
      const zwaveDetachedModeO1 = zwaveDetachedModeO1Array[0];
      const zwaveDetachedModeO2Raw = await this.configurationGet({index: 8});
      const zwaveDetachedModeO2Array = Array.from(zwaveDetachedModeO2Raw['Configuration Value']);
      const zwaveDetachedModeO2 = zwaveDetachedModeO2Array[0];

      if (Number(zwaveDetachedModeO1) === 1) { // detached mode for O1
        this.dimmerSwitchDetachedMode(0, 'detached');
      } else {
        this.dimmerSwitchDetachedMode(0, 'normal');
      }

      if (Number(zwaveDetachedModeO2) === 1) { // detached mode for O2
        this.dimmerSwitchDetachedMode(1, 'detached');
      } else {
        this.dimmerSwitchDetachedMode(1, 'normal');
      }

    } catch (error) {
      this.error(error);
    }    
  }

  async onSettings({oldSettings, newSettings, changedKeys}) {
    try {
      if (changedKeys.includes("zwaveOutputDetached1")) {
        if (Number(newSettings.zwaveOutputDetached1) === 1) { // detached mode for O1
          this.dimmerSwitchDetachedMode(0, 'detached');
        } else if (Number(newSettings.zwaveOutputDetached1) === 0) {
          this.dimmerSwitchDetachedMode(0, 'normal');
        }
      }
      if (changedKeys.includes("zwaveOutputDetached2")) {
        if (Number(newSettings.zwaveOutputDetached2) === 1) { // detached mode for O2
          this.dimmerSwitchDetachedMode(1, 'detached');
        } else if (Number(newSettings.zwaveOutputDetached2) === 0) {
          this.dimmerSwitchDetachedMode(1, 'normal');
        }
      }
      return await super.onSettings({oldSettings, newSettings, changedKeys});
    } catch (error) {
      this.error(error);
    }
  }

  async dimmerSwitchDetachedMode(output, mode) {
    try {
      let node_channel = 2;
      let capability = 'input_1';
      let triggerInputChanged = 'triggerInput1Changed';
      let triggerInputOn = 'triggerInput1On';
      let triggerInputOff = 'triggerInput1Off';

      switch(output) {
        case 0:
          node_channel = 2;
          capability = 'input_1';
          triggerInputChanged = 'triggerInput1Changed';
          triggerInputOn = 'triggerInput1On';
          triggerInputOff = 'triggerInput1Off';
          break;
        case 1:
          node_channel = 3;
          capability = 'input_2';
          triggerInputChanged = 'triggerInput2Changed';
          triggerInputOn = 'triggerInput2On';
          triggerInputOff = 'triggerInput2Off';
          break;
      }

      if (mode === 'normal') {
        if (this.hasCapability(capability)) { await this.removeCapability(capability); }
      } else if (mode ==='detached') {
        if (!this.hasCapability('actionEvents')) { await this.addCapability('actionEvents'); }

        if (!this.hasCapability(capability)) { await this.addCapability(capability); }

        this.registerCapability(capability, 'SWITCH_BINARY', {
          multiChannelNodeId: node_channel,
          get: 'SWITCH_BINARY_GET',
          set: 'SWITCH_BINARY_SET',
          getOpts: {
            getOnStart: true,
          },
          setParserV1: value => ({
            'Switch Value': value ? 'on/enable' : 'off/disable',
          }),
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
          reportParserV1: report => {
            if (report && report.hasOwnProperty('Value')) {
              if (report.Value === 'on/enable') return true;
              if (report.Value === 'off/disable') return false;
            }
            return null;
          },
          reportParserV2: report => {
            if (report && report.hasOwnProperty('Current Value')) {
              if (report['Current Value'] === 'on/enable') return true;
              if (report['Current Value'] === 'off/disable') return false;
            }
            return null;
          },
        });

        this.registerMultiChannelReportListener(node_channel, 'SWITCH_BINARY', 'SWITCH_BINARY_REPORT', async report => {
          this.homey.flow.getDeviceTriggerCard(triggerInputChanged).trigger(this, {}, {}).catch(error => { this.error(error) });
          if (report['Target Value'] === 'on/enable') {
            this.homey.flow.getDeviceTriggerCard(triggerInputOn).trigger(this, {}, {}).catch(error => { this.error(error) });
          } else {
            this.homey.flow.getDeviceTriggerCard(triggerInputOff).trigger(this, {}, {}).catch(error => { this.error(error) });
          }
        });

      } else {
        this.error('Operating mode not recognized')
      }
    } catch (error) {
      this.error(error);
    }
  }

}

module.exports = ShellyWaveProDimmer1PMDevice;