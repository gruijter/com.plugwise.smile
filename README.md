# Plugwise smile P1 #

Homey app to integrate Plugwise Smile P1 energy meter. A direct connection over
IP is used, so there is no need for the Plugwise Stretch.

The app logs and provides flow cards for the following data:
- Actual power usage/production (W, 10s interval)
- Totalized power meter (kWh)
- All individual power meters (kWh)
- Recent gas usage (m3, of the previous hour)
- Gas meter (m3)
- Tariff change (off-peak, true or false)

Ledring screensaver:
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
and if you really like it you can buy me a beer.

[![Paypal donate][pp-donate-image]][pp-donate-link]
===============================================================================

Version changelog

```
v2.1.0	2019.01.26 Homey V2 icons and insights. Ledring fix. Memory optimizations. New forum link.
v2.0.4	2018.05.04 Update device settings bug fixed
v2.0.3	2018.03.12 License info extended.
v2.0.2	2018.01.29 Minor fix.
v2.0.1	2018.01.19 Minor fixes. Stable release.
v2.0.0	2018.01.14 Complete rewrite to sdk2.
v1.1.2  2017.04.19 Added polling interval setting
v0.9.5  2016.06.01 Initial release
```
[forum]: https://community.athom.com/t/8012
[pp-donate-link]: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=M9M847YNL7SB2
[pp-donate-image]: https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif
