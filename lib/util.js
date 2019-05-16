const Homey = require('homey');
const fetch = require('node-fetch');

exports.sendCommand = function (endpoint, address, username, password) {
  return new Promise(function (resolve, reject) {
    fetch('http://'+ address + endpoint, {
        method: 'GET',
        headers: {'Authorization': 'Basic ' + Buffer.from(username + ":" + password).toString('base64')}
      })
      .then(checkStatus)
      .then(res => res.json())
      .then(json => {
        console.log("sending command ok";
        return resolve(json);
      })
      .catch(err => {
        console.log("sending command error: ", err);
        return reject(err);
      });
  })
}

function checkStatus(res) {
  if (res.ok) {
    return res;
  } else {
    throw new Error(res.status);
  }
}

function isEmpty(obj) {
  for(var prop in obj) {
    if(obj.hasOwnProperty(prop))
      return false;
  }
  return true;
}
