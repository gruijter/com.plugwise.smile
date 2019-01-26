/*
Copyright 2016 - 2019, Robin de Gruijter (gruijter@hotmail.com)

This file is part of com.plugwise.smile.

com.plugwise.smile is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

com.plugwise.smile is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with com.plugwise.smile.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';

const http = require('http');
// const util = require('util');

const meterPath = '/core/modules';
// const objectsPath = '/core/domain_objects';
// const firmwarePath = '/update/firmware';
// const wifiPath = '/configuration/wifi';
const defaultPort = 80;

const regexMeasurePower = new RegExp(/unit='W' directionality='consumed'>(.*?)<\/measurement>/);
const regexMeasurePowerProduced = new RegExp(/unit='W' directionality='produced'>(.*?)<\/measurement>/);
const regexPowerPeak = new RegExp(/unit='Wh' directionality='consumed' tariff_indicator='nl_peak'>(.*?)<\/measurement>/);
const regexPowerOffpeak = new RegExp(/unit='Wh' directionality='consumed' tariff_indicator='nl_offpeak'>(.*?)<\/measurement>/);
const regexPowerPeakProduced = new RegExp(/unit='Wh' directionality='produced' tariff_indicator='nl_peak'>(.*?)<\/measurement>/);
const regexPowerOffpeakProduced = new RegExp(/unit='Wh' directionality='produced' tariff_indicator='nl_offpeak'>(.*?)<\/measurement>/);
const regexGas = new RegExp(/unit='m3' directionality='consumed'>(.*?)<\/measurement>/);
const regexPowerTm = new RegExp(/<measurement log_date='(.*?)' unit='Wh' directionality='consumed' tariff_indicator='nl_offpeak'>/);
const regexGasTm = new RegExp(/<measurement log_date='(.*?)' unit='m3' directionality='consumed'>/);
// const regexFwLevel = new RegExp(/<version>(.*?)<\/version>/);

class SmileP1 {
	// Represents a session to a Plugwise Smile P1 device.
	constructor(smileId, host, port) {
		this.host = host;
		this.smileId = smileId;
		this.port = port || defaultPort;
	}

	getMeter(smileId, host, port) {
		this.smileId = smileId || this.smileId;
		this.host = host || this.host;
		this.port = port || this.port;
		return new Promise((resolve, reject) => {
			this._makeRequest(meterPath)
				.then((result) => {
					const readings = {};
					try {
						const measurePower = Number(regexMeasurePower.exec(result.body)[1]);
						const measurePowerProduced = Number(regexMeasurePowerProduced.exec(result.body)[1]);
						const powerPeak = Number(regexPowerPeak.exec(result.body)[1]) / 1000;
						const powerOffpeak = Number(regexPowerOffpeak.exec(result.body)[1]) / 1000;
						const powerPeakProduced = Number(regexPowerPeakProduced.exec(result.body)[1]) / 1000;
						const powerOffpeakProduced = Number(regexPowerOffpeakProduced.exec(result.body)[1]) / 1000;
						const powerTm = Date.parse(regexPowerTm.exec(result.body)[1]);
						readings.e = {
							measurePower,
							measurePowerProduced,
							powerPeak,
							powerOffpeak,
							powerPeakProduced,
							powerOffpeakProduced,
							powerTm,
						};
					}	catch (error) {
						return reject(Error('Error parsing power information'));
					}
					try {
						const gas = Number(regexGas.exec(result.body)[1]);
						const gasTm = Date.parse(regexGasTm.exec(result.body)[1]);
						readings.g = {
							gas,
							gasTm,
						};
					}	catch (error) {
						// util.log('no gas readings available');
					}
					return resolve(readings);
				})
				.catch((error) => {
					reject(error);	// request failed
				});
		});
	}


	_makeRequest(action) {
		return new Promise((resolve, reject) => {
			const headers = {
				Connection: 'keep-alive',
			};
			const options = {
				hostname: this.host,
				port: this.port,
				path: action,
				auth: `smile:${this.smileId}`,
				headers,
				method: 'GET',
			};
			const req = http.request(options, (res) => {
				const { statusCode } = res;
				const contentType = res.headers['content-type'];
				let error;
				if (statusCode === 401) {
					error = new Error('401 Unauthorized (wrong smileId or wrong IP)');
				} else if (statusCode !== 200) {
					error = new Error(`Request Failed. Status Code: ${statusCode}`);
				} else if (!/^text\/xml/.test(contentType)) {
					error = new Error(`Invalid content-type. Expected text/xml but received ${contentType}`);
				}
				if (error) {
					// consume response data to free up memory
					res.resume();
					reject(error);
					return;
				}
				let resBody = '';
				res.on('data', (chunk) => {
					resBody += chunk;
				});
				res.on('end', () => {
					res.body = resBody;
					resolve(res); // resolve the request
				});
			});
			req.on('error', (e) => {
				reject(e);
			});
			req.setTimeout(8000, () => {
				req.abort();
				reject(Error('Connection timeout'));
			});
			req.end();
		});
	}

}

module.exports = SmileP1;

/*

meter xml:
<modules>
<module id="c678caf322124cc2bd4b84c0e514b103">
<vendor_name>Xemex</vendor_name>
<vendor_model>XMX5XMXABCE000021673</vendor_model>
<hardware_version/>
<firmware_version/>
<created_date>2013-04-08T09:00:00+02:00</created_date>
<modified_date>2017-04-01T09:04:20.361+02:00</modified_date>
<deleted_date/>
<services>
<electricity_interval_meter id="1234b34867314ccb886bb72455611344">
<measurement log_date="2017-03-27T16:00:00+02:00" unit="Wh" interval="PT300S" directionality="produced" tariff_indicator="nl_offpeak">0.000</measurement>
<measurement log_date="2017-03-27T16:00:00+02:00" unit="Wh" interval="PT300S" directionality="produced" tariff_indicator="nl_peak">0.000</measurement>
<measurement log_date="2017-03-27T16:00:00+02:00" unit="Wh" interval="PT300S" directionality="consumed" tariff_indicator="nl_offpeak">0.000</measurement>
<measurement log_date="2017-03-27T16:00:00+02:00" unit="Wh" interval="PT300S" directionality="consumed" tariff_indicator="nl_peak">647.000</measurement>
</electricity_interval_meter>
<electricity_point_meter id="d33a5cf0b4eb46c2989dba87d07b2c3c">
<measurement log_date="2017-03-27T16:36:55+02:00" unit="W" directionality="produced">0.000</measurement>
<measurement log_date="2017-03-27T16:36:55+02:00" unit="W" directionality="consumed">1130.000</measurement>
</electricity_point_meter>
<electricity_cumulative_meter id="a99baa51dda834556905f3ea1689d34g5">
<measurement log_date="2017-03-27T16:35:00+02:00" unit="Wh" directionality="produced" tariff_indicator="nl_offpeak">1100755.000</measurement>
<measurement log_date="2017-03-27T16:35:00+02:00" unit="Wh" directionality="produced" tariff_indicator="nl_peak">2979339.000</measurement>
<measurement log_date="2017-03-27T16:35:00+02:00" unit="Wh" directionality="consumed" tariff_indicator="nl_offpeak">10694674.000</measurement>
<measurement log_date="2017-03-27T16:35:00+02:00" unit="Wh" directionality="consumed" tariff_indicator="nl_peak">7173526.000</measurement>
</electricity_cumulative_meter>
</services>
<protocols>
<dsmrmain id="4bb5353c44db4198bb83d446b68abc00">
<serial>98108309</serial>
<dsmrmbuses>
<dsmrgas id="g6a1aeab9f1e43e8b4e2d37b73f91234"/>
</dsmrmbuses>
</dsmrmain>
</protocols>
</module>
<module id="a11aaa16b25046baa84feaa084923a3g">
<vendor_name/>
<vendor_model/>
<hardware_version/>
<firmware_version/>
<created_date>2013-04-08T08:00:00+02:00</created_date>
<modified_date>2017-04-01T09:04:20.360+02:00</modified_date>
<deleted_date/>
<services>
<gas_interval_meter id="8b218f7016734f3cb3835e8c3a9b50c3">
<measurement log_date="2017-03-27T15:00:00+02:00" unit="m3" interval="PT1H" directionality="consumed">0.000</measurement>
</gas_interval_meter>
<gas_cumulative_meter id="22a97f7762c84cc8973a752a8126cafe">
<measurement log_date="2017-03-27T16:00:00+02:00" unit="m3" directionality="consumed">4977.361</measurement>
</gas_cumulative_meter>
</services>
<protocols>
<dsmrgas id="f3a4aeab9f1e43e8b4e2d37b73f94045">
<serial>18911001147028341</serial>
<dsmrmain id="7f31353c44db4198bb83d446b68ced45"/>
</dsmrgas>
</protocols>
</module>
</modules>

meter JSON:
{ e:
   { measurePower: 1130,
     measurePowerProduced: 0,
     powerPeak: 7173.526,
     powerOffpeak: 10694.674,
     powerPeakProduced: 2979.339,
     powerOffpeakProduced: 1100.755,
     powerTm: 1490625300000 },
  g: { gas: 4977.361, gasTm: 1490623200000 }
}


firmware XML:
<update>
	<firmware>
		<current>
			<version>2.1.13</version>
		</current>
		<upgrade>
			<state>no upgrade</state>
		</upgrade>
	</firmware>
</update>


domain objects:
<domain_objects>
<module id="b278caf322124cf0bd4b84c0e514a295">
<vendor_name>Xemex</vendor_name>
<vendor_model>XMX5XMXABCE000021673</vendor_model>
<hardware_version/>
<firmware_version/>
<created_date>2013-04-08T09:00:00+02:00</created_date>
<modified_date>2019-01-26T15:40:02.447+01:00</modified_date>
<deleted_date/>
<services>
<electricity_cumulative_meter id="a17aa51dda834556905f3ea1689d18f7">
<measurement log_date="2019-01-26T15:35:00+01:00" unit="Wh" directionality="produced" tariff_indicator="nl_offpeak">1575458.000</measurement>
<measurement log_date="2019-01-26T15:35:00+01:00" unit="Wh" directionality="produced" tariff_indicator="nl_peak">4267304.000</measurement>
<measurement log_date="2019-01-26T15:35:00+01:00" unit="Wh" directionality="consumed" tariff_indicator="nl_offpeak">16796096.000</measurement>
<measurement log_date="2019-01-26T15:35:00+01:00" unit="Wh" directionality="consumed" tariff_indicator="nl_peak">10393436.000</measurement>
</electricity_cumulative_meter>
<electricity_interval_meter id="6765e34867314ccb886bb72455610694">
<measurement log_date="2019-01-26T15:00:00+01:00" unit="Wh" interval="PT300S" directionality="produced" tariff_indicator="nl_offpeak">-0.000</measurement>
<measurement log_date="2019-01-26T15:00:00+01:00" unit="Wh" interval="PT300S" directionality="produced" tariff_indicator="nl_peak">0.000</measurement>
<measurement log_date="2019-01-26T15:00:00+01:00" unit="Wh" interval="PT300S" directionality="consumed" tariff_indicator="nl_offpeak">562.000</measurement>
<measurement log_date="2019-01-26T15:00:00+01:00" unit="Wh" interval="PT300S" directionality="consumed" tariff_indicator="nl_peak">0.000</measurement>
</electricity_interval_meter>
<electricity_point_meter id="c35b5cf0b4eb46c2989dba87d07b1b7b">
<measurement log_date="2019-01-26T15:39:56+01:00" unit="W" directionality="produced">0.000</measurement>
<measurement log_date="2019-01-26T15:39:56+01:00" unit="W" directionality="consumed">320.000</measurement>
</electricity_point_meter>
</services>
<protocols>
<dsmrmain id="7ce8353c44db4198bb83d446b68cec01">
<serial>98108309 </serial>
<dsmrmbuses>
<dsmrgas id="f7b2aeab9f1e43e8b4e2d37b73f96045"/>
</dsmrmbuses>
</dsmrmain>
</protocols>
</module>
<module id="b48aaa16b25046baa84feaa084922e8f">
<vendor_name/>
<vendor_model/>
<hardware_version/>
<firmware_version/>
<created_date>2013-04-08T08:00:00+02:00</created_date>
<modified_date>2019-01-26T15:40:02.447+01:00</modified_date>
<deleted_date/>
<services>
<gas_interval_meter id="9a438f7016734f3cb3835e8c3a9b92d5">
<measurement log_date="2019-01-26T14:00:00+01:00" unit="m3" interval="PT1H" directionality="consumed">0.207</measurement>
</gas_interval_meter>
<gas_cumulative_meter id="44e77f7762c84cc8973a752a8128caf5">
<measurement log_date="2019-01-26T15:00:00+01:00" unit="m3" directionality="consumed">6542.004</measurement>
</gas_cumulative_meter>
</services>
<protocols>
<dsmrgas id="f7b2aeab9f1e43e8b4e2d37b73f96045">
<serial>28011001147026511</serial>
<dsmrmain id="7ce8353c44db4198bb83d446b68cec01"/>
</dsmrgas>
</protocols>
</module>
<location id="fafcd13da58c4547816ca7f01b68c97a">
<name>P1 Meter</name>
<description/>
<type>building</type>
<created_date>2012-07-31T15:05:08+02:00</created_date>
<modified_date>2015-03-24T12:55:17+01:00</modified_date>
<deleted_date/>
<actuators/>
<locations/>
<appliances/>
<services>
<electricity_interval_meter id="6765e34867314ccb886bb72455610694"/>
<gas_cumulative_meter id="44e77f7762c84cc8973a752a8128caf5"/>
<gas_interval_meter id="9a438f7016734f3cb3835e8c3a9b92d5"/>
<electricity_point_meter id="c35b5cf0b4eb46c2989dba87d07b1b7b"/>
<electricity_cumulative_meter id="a17aa51dda834556905f3ea1689d18f7"/>
</services>
<logs>
<point_log id="1b9c83a9e28d4f33bfa5fcc5b8435a71">
<unit>W</unit>
<type>electricity_produced</type>
<last_consecutive_log_date>2019-01-26T15:39:56+01:00</last_consecutive_log_date>
<updated_date>2019-01-26T15:39:56+01:00</updated_date>
<period start_date="2015-02-21T12:30:05+01:00" end_date="2019-01-26T15:39:56+01:00">
<measurement log_date="2019-01-26T15:39:56+01:00">0.000</measurement>
</period>
</point_log>
<interval_log id="3418669cbeee4913b5e6ef4564dc28db">
<unit>Wh</unit>
<type>electricity_consumed</type>
<last_consecutive_log_date>2019-01-26T14:00:00+01:00</last_consecutive_log_date>
<updated_date>2019-01-26T15:00:00+01:00</updated_date>
<interval>PT300S</interval>
<period start_date="2015-02-21T13:00:00+01:00" end_date="2019-01-26T15:00:00+01:00" interval="PT1H">
<measurement log_date="2019-01-26T15:00:00+01:00" tariff_indicator="nl_offpeak">562.000</measurement>
<measurement log_date="2019-01-26T15:00:00+01:00" tariff_indicator="nl_peak">0.000</measurement>
</period>
</interval_log>
<point_log id="1ef46525fa584c38b02b9a52227f2907">
<unit>W</unit>
<type>electricity_consumed</type>
<last_consecutive_log_date>2019-01-26T15:39:56+01:00</last_consecutive_log_date>
<updated_date>2019-01-26T15:39:56+01:00</updated_date>
<period start_date="2015-02-21T12:30:05+01:00" end_date="2019-01-26T15:39:56+01:00">
<measurement log_date="2019-01-26T15:39:56+01:00">320.000</measurement>
</period>
</point_log>
<cumulative_log id="497cc22ea315486fade7fae0b2ab730e">
<unit>Wh</unit>
<type>electricity_consumed</type>
<last_consecutive_log_date>2019-01-26T15:35:00+01:00</last_consecutive_log_date>
<updated_date>2019-01-26T15:35:00+01:00</updated_date>
<period start_date="2015-02-21T12:30:05+01:00" end_date="2019-01-26T15:35:00+01:00">
<measurement log_date="2019-01-26T15:35:00+01:00" tariff_indicator="nl_offpeak">16796096.000</measurement>
<measurement log_date="2019-01-26T15:35:00+01:00" tariff_indicator="nl_peak">10393436.000</measurement>
</period>
</cumulative_log>
<cumulative_log id="9ce1baaf6a7a4d5fb01ac07524b37315">
<unit>Wh</unit>
<type>electricity_produced</type>
<last_consecutive_log_date>2019-01-26T15:35:00+01:00</last_consecutive_log_date>
<updated_date>2019-01-26T15:35:00+01:00</updated_date>
<period start_date="2015-02-21T12:30:05+01:00" end_date="2019-01-26T15:35:00+01:00">
<measurement log_date="2019-01-26T15:35:00+01:00" tariff_indicator="nl_offpeak">1575458.000</measurement>
<measurement log_date="2019-01-26T15:35:00+01:00" tariff_indicator="nl_peak">4267304.000</measurement>
</period>
</cumulative_log>
<cumulative_log id="565ac17fc65048479dfc17a34db294c1">
<unit>m3</unit>
<type>gas_consumed</type>
<last_consecutive_log_date>2019-01-26T15:00:00+01:00</last_consecutive_log_date>
<updated_date>2019-01-26T15:00:00+01:00</updated_date>
<period start_date="2015-02-21T13:00:00+01:00" end_date="2019-01-26T15:00:00+01:00">
<measurement log_date="2019-01-26T15:00:00+01:00">6542.004</measurement>
</period>
</cumulative_log>
<interval_log id="46874d195710417eadf4d033587690d6">
<unit>m3</unit>
<type>gas_consumed</type>
<last_consecutive_log_date>2019-01-26T14:00:00+01:00</last_consecutive_log_date>
<updated_date>2019-01-26T14:00:00+01:00</updated_date>
<interval>PT1H</interval>
<period start_date="2015-02-21T13:00:00+01:00" end_date="2019-01-26T14:00:00+01:00" interval="PT1H">
<measurement log_date="2019-01-26T14:00:00+01:00">0.207</measurement>
</period>
</interval_log>
<interval_log id="b0405bfdc023490592642a7882bae5b6">
<unit>Wh</unit>
<type>electricity_produced</type>
<last_consecutive_log_date>2019-01-26T14:00:00+01:00</last_consecutive_log_date>
<updated_date>2019-01-26T15:00:00+01:00</updated_date>
<interval>PT300S</interval>
<period start_date="2015-02-21T13:00:00+01:00" end_date="2019-01-26T15:00:00+01:00" interval="PT1H">
<measurement log_date="2019-01-26T15:00:00+01:00" tariff_indicator="nl_offpeak">-0.000</measurement>
<measurement log_date="2019-01-26T15:00:00+01:00" tariff_indicator="nl_peak">0.000</measurement>
</period>
</interval_log>
</logs>
</location>
</domain_objects>

*/
