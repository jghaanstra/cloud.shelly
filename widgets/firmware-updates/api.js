'use strict';

module.exports = {
  async getFirmwareUpdates({ homey, query }) {
    return await homey.app.getFirmwareUpdates(query.stage);
  },
  async updateFirmware({ homey, query }) {
    return await homey.app.updateFirmware(query.id);
  }
};
