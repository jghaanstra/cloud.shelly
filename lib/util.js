const Homey = require('homey');
const rp = require('request-promise-native');

exports.sendCommand = function (endpoint, address, username, password) {

  return new Promise(function (resolve, reject) {
    var options = {
      url: "http://"+ address + endpoint,
      auth: {
        user: username,
        pass: password
      },
      resolveWithFullResponse: true,
      timeout: 4000
    };

    rp(options)
      .then(function (response) {
        if (response.statusCode == 200) {
          var data = JSON.parse(response.body);
          return resolve(data);
        } else {
          return reject(response.statusCode);
        }
      })
      .catch(function (error) {
        return reject(error.statusCode);
      });
  })
}

function isEmpty(obj) {
  for(var prop in obj) {
    if(obj.hasOwnProperty(prop))
      return false;
  }
  return true;
}
