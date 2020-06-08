'use strict';

const Homey = require('homey');
const util = require('/lib/util.js');

class Shellyi3Device extends Homey.Device {

  onInit() {
    new Homey.FlowCardTriggerDevice('triggerCallbackEvents').register();

    this.registerCapabilityListener('button.callbackevents', async () => {
      this.addCallbackUrls();
    });

    this.registerCapabilityListener('button.removecallbackevents', async () => {
      var btn_on_url_0 = '/settings/input/0?btn_on_url=null';
      var btn_off_url_0 = '/settings/input/0?btn_off_url=null';
      var shortpush_url_0 = '/settings/input/0?shortpush_url=null';
      var longpush_url_0 = '/settings/input/0?longpush_url=null';
      var double_shortpush_url_0 = '/settings/input/0?double_shortpush_url=null';
      var double_longpush_url_0 = '/settings/input/0?double_longpush_url=null';
      var triple_shortpush_url_0 = '/settings/input/0?triple_shortpush_url=null';
      var triple_longpush_url_0 = '/settings/input/0?triple_longpush_url=null';
      var shortpush_longpush_url_0 = '/settings/input/0?shortpush_longpush_url=null';
      var longpush_shortpush_url_0 = '/settings/input/0?longpush_shortpush_url=null';

      var btn_on_url_1 = '/settings/input/1?btn_on_url=null';
      var btn_off_url_1 = '/settings/input/1?btn_off_url=null';
      var shortpush_url_1 = '/settings/input/1?shortpush_url=null';
      var longpush_url_1 = '/settings/input/1?longpush_url=null';
      var double_shortpush_url_1 = '/settings/input/1?double_shortpush_url=null';
      var double_longpush_url_1 = '/settings/input/1?double_longpush_url=null';
      var triple_shortpush_url_1 = '/settings/input/1?triple_shortpush_url=null';
      var triple_longpush_url_1 = '/settings/input/1?triple_longpush_url=null';
      var shortpush_longpush_url_1 = '/settings/input/1?shortpush_longpush_url=null';
      var longpush_shortpush_url_1 = '/settings/input/1?longpush_shortpush_url=null';

      var btn_on_url_2 = '/settings/input/2?btn_on_url=null';
      var btn_off_url_2 = '/settings/input/2?btn_off_url=null';
      var shortpush_url_2 = '/settings/input/2?shortpush_url=null';
      var longpush_url_2 = '/settings/input/2?longpush_url=null';
      var double_shortpush_url_2 = '/settings/input/2?double_shortpush_url=null';
      var double_longpush_url_2 = '/settings/input/2?double_longpush_url=null';
      var triple_shortpush_url_2 = '/settings/input/2?triple_shortpush_url=null';
      var triple_longpush_url_2 = '/settings/input/2?triple_longpush_url=null';
      var shortpush_longpush_url_2 = '/settings/input/2?shortpush_longpush_url=null';
      var longpush_shortpush_url_2 = '/settings/input/2?longpush_shortpush_url=null';

      try {
        await util.sendCommand(btn_on_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn_off_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(shortpush_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(longpush_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(double_shortpush_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(double_longpush_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(triple_shortpush_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(triple_longpush_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(shortpush_longpush_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(longpush_shortpush_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));

        await util.sendCommand(btn_on_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn_off_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(shortpush_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(longpush_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(double_shortpush_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(double_longpush_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(triple_shortpush_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(triple_longpush_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(shortpush_longpush_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(longpush_shortpush_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));

        await util.sendCommand(btn_on_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(btn_off_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(shortpush_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(longpush_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(double_shortpush_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(double_longpush_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(triple_shortpush_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(triple_longpush_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(shortpush_longpush_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
        await util.sendCommand(longpush_shortpush_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));

        return;
      } catch (error) {
        throw new Error(error);
      }
    });

  }

  onAdded() {
    this.addCallbackUrls();
  }

  async addCallbackUrls() {
    var homeyip = await util.getHomeyIp();
    var btn_on_url_0 = '/settings/input/0?btn_on_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/btn_on_1/';
    var btn_off_url_0 = '/settings/input/0?btn_off_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/btn_off_1/';
    var shortpush_url_0 = '/settings/input/0?shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/shortpush_1/';
    var longpush_url_0 = '/settings/input/0?longpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/longpush_1/';
    var double_shortpush_url_0 = '/settings/input/0?double_shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/double_shortpush_1/';
    var double_longpush_url_0 = '/settings/input/0?double_longpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/double_longpush_1/';
    var triple_shortpush_url_0 = '/settings/input/0?triple_shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/triple_shortpush_1/';
    var triple_longpush_url_0 = '/settings/input/0?triple_longpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/triple_longpush_1/';
    var shortpush_longpush_url_0 = '/settings/input/0?shortpush_longpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/shortpush_longpush_1/';
    var longpush_shortpush_url_0 = '/settings/input/0?longpush_shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/longpush_shortpush_1/';

    var btn_on_url_1 = '/settings/input/1?btn_on_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/btn_on_2/';
    var btn_off_url_1 = '/settings/input/1?btn_off_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/btn_off_2/';
    var shortpush_url_1 = '/settings/input/1?shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/shortpush_2/';
    var longpush_url_1 = '/settings/input/1?longpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/longpush_2/';
    var double_shortpush_url_1 = '/settings/input/1?double_shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/double_shortpush_2/';
    var double_longpush_url_1 = '/settings/input/1?double_longpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/double_longpush_2/';
    var triple_shortpush_url_1 = '/settings/input/1?triple_shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/triple_shortpush_2/';
    var triple_longpush_url_1 = '/settings/input/1?triple_longpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/triple_longpush_2/';
    var shortpush_longpush_url_1 = '/settings/input/1?shortpush_longpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/shortpush_longpush_2/';
    var longpush_shortpush_url_1 = '/settings/input/1?longpush_shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/longpush_shortpush_2/';

    var btn_on_url_2 = '/settings/input/2?btn_on_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/btn_on_3/';
    var btn_off_url_2 = '/settings/input/2?btn_off_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/btn_off_3/';
    var shortpush_url_2 = '/settings/input/2?shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/shortpush_3/';
    var longpush_url_2 = '/settings/input/2?longpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/longpush_3/';
    var double_shortpush_url_2 = '/settings/input/2?double_shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/double_shortpush_3/';
    var double_longpush_url_2 = '/settings/input/2?double_longpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/double_longpush_3/';
    var triple_shortpush_url_2 = '/settings/input/2?triple_shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/triple_shortpush_3/';
    var triple_longpush_url_2 = '/settings/input/2?triple_longpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/triple_longpush_3/';
    var shortpush_longpush_url_2 = '/settings/input/2?shortpush_longpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/shortpush_longpush_3/';
    var longpush_shortpush_url_2 = '/settings/input/2?longpush_shortpush_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/shellyi3/'+ this.getData().id +'/longpush_shortpush_3/';

    try {
      await util.sendCommand(btn_on_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(btn_off_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(shortpush_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(longpush_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(double_shortpush_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(double_longpush_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(triple_shortpush_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(triple_longpush_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(shortpush_longpush_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(longpush_shortpush_url_0, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));

      await util.sendCommand(btn_on_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(btn_off_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(shortpush_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(longpush_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(double_shortpush_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(double_longpush_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(triple_shortpush_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(triple_longpush_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(shortpush_longpush_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(longpush_shortpush_url_1, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));

      await util.sendCommand(btn_on_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(btn_off_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(shortpush_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(longpush_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(double_shortpush_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(double_longpush_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(triple_shortpush_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(triple_longpush_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(shortpush_longpush_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));
      await util.sendCommand(longpush_shortpush_url_2, this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));

      await util.sendCommand('/reboot', this.getSetting('address'), this.getSetting('username'), this.getSetting('password'));

      return;
    } catch (error) {
      throw new Error(error);
    }
  }

  triggerCallbackEvents(action) {
    return Homey.ManagerFlow.getCard('trigger', "triggerCallbackEvents").trigger(this, {"action": action}, {})
  }

}

module.exports = Shellyi3Device;
