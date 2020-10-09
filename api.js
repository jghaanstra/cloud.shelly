'use strict';

const Util = require('/lib/util.js');

module.exports = {
  async buttonActionTrigger({homey, params}) {
    try {
      const util = new Util({homey: homey});
      let device = await homey.drivers.getDriver(params.devicetype).getDevice({'id': params.deviceid});

      // EXTRA ACTIONS SHELLY DW
      if (params.devicetype == 'shellydw') {
        if (!device.getCapabilityValue('alarm_contact') && (params.action == 'open_dark' || params.action == 'open_twilight')) {
          device.setCapabilityValue('alarm_contact', true);
        } else if (device.getCapabilityValue('alarm_contact') && params.action == 'close') {
          device.setCapabilityValue('alarm_contact', false);
        } else if (params.action == 'vibration') {
          device.setCapabilityValue('alarm_tamper', true);
          setTimeout(() => { device.setCapabilityValue('alarm_tamper', false) }, 5000);
        }
      }

      // EXTRA ACTIONS SHELLY FLOOD
      if (params.devicetype == 'shellyflood' && !device.getCapabilityValue('alarm_water') && params.action == 'flood_detected') {
        device.setCapabilityValue('alarm_contact', true);
      } else if (params.devicetype == 'shellyflood' && device.getCapabilityValue('alarm_water') && params.action == 'flood_gone') {
        device.setCapabilityValue('alarm_water', false);
      }

      const result = await homey.flow.getTriggerCard('triggerCallbacks').trigger({"id": params.deviceid, "device": device.getName(), "action": params.action}, {"id": params.deviceid, "device": device.getName(), "action": params.action});
      return result;
    } catch (error) {
      console.log(error);
      return error;
    }
  },
  async reportStatusEvent({homey, params, query}) {
    try {
      const util = new Util({homey: homey});
      const shelly = await homey.drivers.getDriver(params.devicetype).getDevice({'id': params.deviceid});
      const result = await shelly.updateReportStatus(device, query);
      return result;
    } catch (error) {
      console.log(error);
      return error;
    }
  }
}
