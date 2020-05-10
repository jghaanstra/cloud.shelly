const Homey = require('homey');
const fetch = require('node-fetch');

exports.getHomeyIp = function () {
  return new Promise(function (resolve, reject) {
    Homey.ManagerCloud.getLocalAddress()
      .then(localAddress => {
        return resolve(localAddress)
      })
      .catch(error => {
        throw new Error(error);
      })
  })
}

exports.sendCommand = function (endpoint, address, username, password) {
  return new Promise(function (resolve, reject) {
    fetch('http://'+ address + endpoint, {
        method: 'GET',
        headers: {'Authorization': 'Basic ' + Buffer.from(username + ":" + password).toString('base64')}
      })
      .then(checkStatus)
      .then(res => res.json())
      .then(json => {
        return resolve(json);
      })
      .catch(err => {
        return reject(err);
      });
  })
}

exports.normalize = function (value, min, max) {
  var normalized = (value - min) / (max - min);
  return Number(normalized.toFixed(2));
}

exports.denormalize = function (normalized, min, max) {
  var denormalized = ((1 - normalized) * (max - min) + min);
  return Number(denormalized.toFixed(0));
}

function checkStatus(res) {
  if (res.ok) {
    return res;
  } else {
    if (res.status == 401) {
      throw new Error(Homey.__('pair.unauthorized'));
    } else if (res.status == 502 || res.status == 504) {
      throw new Error(Homey.__('pair.timeout'));
    } else if (res.status == 500) {
      throw new Error(Homey.__('pair.servererror'));
    } else {
      throw new Error(Homey.__('pair.unknownerror'));
    }
  }
}

function isEmpty(obj) {
  for(var prop in obj) {
    if(obj.hasOwnProperty(prop))
      return false;
  }
  return true;
}
