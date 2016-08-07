# Plugwise smile P1 #

Homey app to integrate Plugwise Smile P1 energy meter. A direct connection over
IP is used, so there is no need for the Plugwise Stretch.

The app logs and provides flow cards for the following data:
- Actual power usage/production (W, 10s interval for usage, 5 min for production)
- Totalized power meter (Wh, 5 min updates)
- Gas meter (m3, 1 hour updates)

Additional flow cards for conditional flow and to trigger events:
- Tariff change (off-peak, true or false)

Ledring screensaver:
- See how much energy you are using or producing just by looking at your Homey!
- Is the wash-dryer ready? Am I now producing power to the grid?

The power is totalized for consumed and produced power, during off-peak and
peak hours. Production to the powergrid is displayed as negative watts.
Power production is updated with 5 minutes interval due to P1 limitations.
Only changed values are logged.

To setup go to "Devices" and enter the IP-address and Smile ID. The ID can be
found printed on the device, or can be found in the original app from Plugwise.

When using insights please select 'stepline' to get the correct visual display.

##### Donate: #####
If you like the app you can show your appreciation by posting it in the [forum],
and if you really like it you can donate. Feature requests can also be placed on
the forum.

[![Paypal donate][pp-donate-image]][pp-donate-link]
===============================================================================

Version changelog

```
v0.9.10 2016.08.07 Modified for compatibility to Homey firmware 0.9.2+. Added
custom capabilities for gas usage and off-peak. Logs for these are still missing.

v0.9.9 2016.07.05 Added settings for device card. Ledring settings added. New
internal device datastructure and migration from v0.9.8. Init after pairing
changed to Homey firmware compatibility 0.8.33+. Code cleanup and optimizations.
Testing insights (again) for Tariff. Fixed bug for occasional crash on device
delete. Fix for crash when no gasmeter present.

v0.9.8 2016.06.13
Fixed bug that made app not work correctly for firmware 0.8.37+. Added trigger
cards and tokens for power change and tariff change. Added condition card for
tariff change. Added ledring screensaver. Changed meter power to wH instead of
kWh to match Homey firmware 0.8.35+. Improved connection validation after
successful pairing. Some code optimizations.

v0.9.7 2016.06.03
Added meter mapping to cope with different smart meter brands

v0.9.6 2016.06.02
Improved validation process during pairing

v0.9.5 2016.06.01
Release candidate
```
[forum]: https://forum.athom.com/discussion/1587
[pp-donate-link]: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=M9M847YNL7SB2
[pp-donate-image]: https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif
