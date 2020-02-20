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
        let result = await Homey.ManagerDrivers.getDriver(args.params.devicetype).getDevice({'id': args.params.deviceid}).triggerActions(args.params.action);
        callback(false, 'OK');
      })().catch(err => {
        callback(err, false);
      });
		}
	}
]
