'use strict';

const Util = require('/lib/util.js');

module.exports = {
  async buttonActionTrigger({homey, params}) {
    // TODO: REMOVE ENTIRE API ENDPOINT AFTER 3.1.0
    try {
      const util = new Util({homey: homey});
      const device = await homey.drivers.getDriver(params.devicetype).getDevice({'id': params.deviceid});
      const result = await device.removeCallbacks();
      return 'OK';
    } catch (error) {
      console.log(error);
      return error;
    }
  },
  async reportStatusEvent({homey, params, query}) {
    // TODO: REMOVE ENTIRE API ENDPOINT AFTER 3.1.0
    try {
      const util = new Util({homey: homey});
      const device = await homey.drivers.getDriver(params.devicetype).getDevice({'id': params.deviceid});
      const result = await device.removeCallbacks();
      return 'OK';
    } catch (error) {
      console.log(error);
      return error;
    }
  }
}
