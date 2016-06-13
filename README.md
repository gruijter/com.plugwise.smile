# Plugwise smile P1

Homey app to integrate Plugwise Smile P1 energy meter. A direct connection over
IP is used, so there is no need for the Plugwise Stretch.

The app logs and provides flow cards for the following data:
* Actual power usage/production (W, 10s interval for usage, 5 min for production)
* Totalized power meter (kWh, 5 min updates)
* Gas meter (m3, 1 hour updates)

Additional flow cards for conditional flow and to trigger events:
* Tariff change (off-peak, true or false)

New experimental ledring screensaver:
* See how much energy you are using or producing just by looking at your Homey!
* Is the wash-dryer ready? Am I now producing power to the grid?

The power is totalized for consumed and produced power, during off-peak and
peak hours. Production to the powergrid is displayed as negative watts.
Power production is updated with 5 minutes interval due to P1 limitations.
Only changed values are logged.

To setup go to "Devices" and enter the IP-address and Smile ID. The ID can be
found printed on the device, or can be found in the original app from Plugwise.

When using insights please select 'stepline' to get the correct visual display.

===============================================================================

Version changelog

v0.9.8 2016.06.13
Added trigger cards and tokens for power change and tariff change. Added
condition card for tariff change. Added ledring screensaver. Changed meter power
to wH instead of kWh to match Homey firmware 0.8.35+. Improved connection
validation after successful pairing. Some code optimizations.

v0.9.7 2016.06.03
Added meter mapping to cope with different smart meter brands

v0.9.6 2016.06.02
Improved validation process during pairing

v0.9.5 2016.06.01
Release candidate
