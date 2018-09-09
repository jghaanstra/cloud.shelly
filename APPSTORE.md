# Use Homey to control Shelly devices
This Homey app allows you to control Shelly devices. The supported Shelly devices is limited at this time. Support for missing devices might be added in the future if requested and based on my available time and ability to add support without actually owning the device.

## Supported devices
* Shelly 1

## Instructions
Add your Shelly device in Homey just like you would add any other device. Enter the IP address and the polling frequency in the pairing wizard. If you have set a username and password to access your Shelly device you need to enter these during pairing as well. Connect the device and you are good to go.

## Support topic
For support please use the official support topic on the forum [here](https://community.athom.com/t/696).

## Changelog
### 2018-09-09 - v1.1.0
* NEW: add support for the Shelly 2
* REFACTORING: switched from request node module to node-fetch (reduced footprint from 7,5MB to 400 kB)

### 2018-08-30 - v1.0.0
* NEW: initial release
