'use strict';

const Homey = require('homey');
const Util = require('/lib/util.js');
const semver = require('semver');

class ShellyDevice extends Homey.Device {

  onInit() {
    if (!this.util) this.util = new Util({homey: this.homey});
  }

  async onAdded() {
    await this.homey.app.updateShellyCollection();
    return;
  }

  async onDeleted() {
    try {
      clearInterval(this.pollingInterval);
      const iconpath = "/userdata/" + this.getData().id +".svg";
      await this.util.removeIcon(iconpath);
      await this.homey.app.updateShellyCollection();
      return;
    } catch (error) {
      this.log(error);
    }
  }

  // HELPER FUNCTIONS
  async bootSequence() {
    try {
      if (this.homey.settings.get('general_coap')) {
        this.pollingInterval = setInterval(() => {
          this.initialStateUpdate();
        }, this.homey.settings.get('general_polling_frequency') * 1000 || 5000);
      } else {
        setTimeout(() => {
          this.initialStateUpdate();
        }, this.util.getRandomTimeout(10));
        this.pollingInterval = setInterval(() => {
          this.initialStateUpdate();
        }, 60000);
      }
    } catch (error) {
      this.log(error);
    }
  }

  getCallbacks() {
    return callbacks;
  }

}

module.exports = ShellyDevice;
