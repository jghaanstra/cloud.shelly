const Homey = require('homey');
const util = require('/lib/util.js');

module.exports = [
	{
		description: 'Shelly App API Action Callbacks',
		method   : 'GET',
		path     : '/button_actions/:devicetype/:deviceid/:action',
		public   : true,
		fn: function(args, callback) {
      (async () => {
        let device = await Homey.ManagerDrivers.getDriver(args.params.devicetype).getDevice({'id': args.params.deviceid});

        // EXTRA ACTIONS SHELLY DW
        if (args.params.devicetype == 'shellydw' && !device.getCapabilityValue('alarm_contact') && (args.params.action == 'open_dark' || args.params.action == 'open_twilight')) {
          device.setCapabilityValue('alarm_contact', true);
        } else if (args.params.devicetype == 'shellydw' && device.getCapabilityValue('alarm_contact') && args.params.action == 'close') {
          device.setCapabilityValue('alarm_contact', false);
        }

        device.triggerActions(args.params.action);

        callback(false, 'OK');
      })().catch(err => {
        callback(err, false);
      });
		}
	}
]
