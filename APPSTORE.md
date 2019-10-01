# Use Homey to control Shelly devices
This Homey app allows you to control Shelly devices. The supported Shelly devices is limited at this time. Support for missing devices might be added in the future if requested and based on my available time and ability to add support without actually owning the device.

## Supported devices
* Shelly 1
* Shelly 1PM
* Shelly 2 (Relay and Shutter mode)
* Shelly 2.5 (Relay and Shutter mode)
* Shelly Plug
* Shelly Plug S
* Shelly 4 Pro
* Shelly RBGW2 (Color, 4x White and 2x CW/WW mode)
* Shelly EM
* Shelly Humidity & Temperature Sensor
* Shelly Flood Sensor

## Instructions
Add your Shelly device in Homey just like you would add any other device. Enter the IP address and the polling frequency in the pairing wizard. If you have set a username and password to access your Shelly device you need to enter these during pairing as well. Connect the device and you are good to go.

## Support topic
For support please use the official support topic on the forum [here](https://community.athom.com/t/765).

## Changelog
### v1.13.1- 2019-10-01
* IMPROVEMENT: added total power usage in KWh for Shelly 1 PM, Shelly2.5, Shelly Plug and Shelly Plug S (this requires the re-pairing of the device). The value from the Shelly device is in Wmin. The total power usage in KWh is calculated by doing Wmin * 0.000017.
* FIX: fix for discovery of multiple Shelly Plugs due to deviating implementation of mDNS in Shelly Plugs
