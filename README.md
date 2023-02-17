# Plugwise smile P1 #

Homey app to interface DSMR P1 smart meters via a Plugwise Smile P1.

A direct connection over IP is used, so there is no need for the Plugwise Stretch.

The app logs and provides flow cards for the following data:
- Totalized energy meter (kWh)
- All individual energy meters (kWh)
- Actual total power usage/production (W, 10s interval)
- Power per phase (DSMR4 and higher)
- Voltage per phase (SMR5 and higher)
- Current per phase (SMR5 and higher)
- Recent gas usage (m3, of the previous hour)
- Gas meter (m3)
- Tariff change (off-peak, true or false)

Ledring screensaver (Homey Pro 2016 - 2019):
- See how much energy you are using or producing just by looking at your Homey!
- Is the wash-dryer ready? Am I now producing power to the grid?

The power is totalized for consumed and produced power, during off-peak and
peak hours. Production to the powergrid is displayed as negative watts.
Only changed values are logged.

To setup go to "Devices" and enter the IP-address and Smile ID. The ID can be
found printed on the device, or can be found in the original app from Plugwise.
The polling interval can be changed in the device settings.

##### Donate: #####
If you like the app you can show your appreciation by posting it in the [forum],
and if you really like it you can [buy me a beer](https://paypal.me/gruijter).

===============================================================================

Version changelog: [changelog.txt]

[forum]: https://community.athom.com/t/8012
[changelog.txt]: https://github.com/gruijter/com.plugwise.smile/blob/master/changelog.txt
