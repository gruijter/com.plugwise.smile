'use strict';

const http = require('http');
// const util = require('util');

const meterPath = '/core/modules';
// const getFirmwarePath = '/update/firmware';
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
						reject(Error('Error parsing power information'));
						return readings;
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
*/
