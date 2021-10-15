'use strict';

const Util = require('./lib/util.js');

module.exports = {
  async updateSettings({homey, body}) {
    try {
      const util = new Util({homey: homey});
      const settings = await homey.app.updateSettings(body);
      return 'OK';
    } catch (error) {
      return error;
    }
  }
}
