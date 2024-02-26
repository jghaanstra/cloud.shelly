'use strict';

const Device = require('../device_zwave.js');

class ShellyWavei4Device extends Device {

  async registerCapabilities() {
    try {

      this.registerCapability('input_1', 'SWITCH_BINARY', { multiChannelNodeId: 1 });
      this.registerCapability('input_2', 'SWITCH_BINARY', { multiChannelNodeId: 2 });
      this.registerCapability('input_3', 'SWITCH_BINARY', { multiChannelNodeId: 3 });
      this.registerCapability('input_4', 'SWITCH_BINARY', { multiChannelNodeId: 4 });

      this.registerReportListener('CENTRAL_SCENE', 'CENTRAL_SCENE_NOTIFICATION', report => {
        const action_event = this.util.getActionEventDescription(report.Properties1['Key Attributes'], 'zwave') + '_' + report['Scene Number'];
        this.homey.flow.getDeviceTriggerCard('triggerActionEvent').trigger(this, {"action": action_event}, {"action": action_event}).catch(error => { this.error(error) });
      });

    } catch (error) {
      this.error(error);
    }    
  }

}

module.exports = ShellyWavei4Device;