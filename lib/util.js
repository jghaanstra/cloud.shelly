const Homey = require('homey');
const fetch = require('node-fetch');
const fs = require('fs');

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

exports.sendCommand = function (endpoint, address, username, password, type = 'request') {
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
        if (type == 'request') {
          console.error(err);
        }
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

exports.uploadIcon = function (img, id) {
  return new Promise(function (resolve, reject) {
    try {
      const path = "../userdata/"+ id +".svg";
      const base64 = img.replace("data:image/svg+xml;base64,", '');
      fs.writeFile(path, base64, 'base64', (error) => {
        if (error) {
          return reject(error);
        } else {
          return resolve(true);
        }
      });
    } catch (error) {
      return reject(error);
    }
  })
}

exports.removeIcon = function (iconpath) {
  return new Promise(function (resolve, reject) {
    try {
      if (fs.existsSync(iconpath)) {
        fs.unlinkSync(iconpath);
        return resolve(true);
      } else {
        return resolve(true);
      }
    } catch (error) {
      return reject(error);
    }
  })
}

exports.addCallbackEvents = function (path, urls, device, deviceid, ip, username, password) {
  return new Promise(async function (resolve, reject) {
    try {
      var homeyip = await exports.getHomeyIp();
      for (let index = 0; index < urls.length; index++) {
        if (urls[index] == 'report') {
          var command = path + urls[index] +'_url=http://'+ homeyip +'/api/app/cloud.shelly/report_status/'+ device +'/'+ deviceid +'/';
        } else {
          var command = path + urls[index] +'_url=http://'+ homeyip +'/api/app/cloud.shelly/button_actions/'+ device +'/'+ deviceid +'/'+ urls[index] + '/';
        }
        await exports.sendCommand(command, ip, username, password);
      }
      await exports.sendCommand('/reboot', ip, username, password);
      return resolve();
    } catch (error) {
      console.log(error);
      return reject(error);
    }
  });
}

exports.removeCallbackEvents = function (path, urls, ip, username, password) {
  return new Promise(async function (resolve, reject) {
    try {
      for (let index = 0; index < urls.length; index++) {
        let command = path + urls[index] +'_url=null';
        await exports.sendCommand(command, ip, username, password);
      }
      return resolve();
    } catch (error) {
      return reject(error);
    }
  });
}

function checkStatus(res) {
  if (res.ok) {
    return res;
  } else {
    console.error(res);
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
