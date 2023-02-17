/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-destructuring */
/*
Copyright 2016 - 2023, Robin de Gruijter (gruijter@hotmail.com)

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

const Homey = require('homey');
const SmileP1 = require('smilep1');
const Ledring = require('../../ledring');

class Driver extends Homey.Driver {

	onInit() {
		this.log('entering driver');
		this.ledring = new Ledring({ screensaver: 'smile_power', homey: this.homey });
	}

	async onPair(session) {
		session.setHandler('validate', async (data) => {
			try {
				this.log('save button pressed in frontend');
				const host = data.smileIp.split(':')[0];
				const port = Number(data.smileIp.split(':')[1]);
				const options = {
					id: data.smileId,
					host: (host === '') ? undefined : host,
					port: (port === '') ? undefined : port,
				};
				const smile = new SmileP1(options);
				await smile.login();

				// compile selected and available capabilities
				const p1Readings = await smile.getMeterReadings();
				const capabilities = [];
				if (data.includeGas) {
					capabilities.push('measure_gas');
				}
				if (data.includeOffPeak) {
					capabilities.push('meter_offPeak');
				}
				capabilities.push('measure_power');	// always include measure_power
				if (p1Readings && Number.isFinite(p1Readings.l1)) { //  has current and power per phase
					capabilities.push('measure_power.l1');
					if (data.include3phase) {
						capabilities.push('measure_power.l2');
						capabilities.push('measure_power.l3');
					}
				}
				if (p1Readings && Number.isFinite(p1Readings.v1)) { // has voltage and current per phase
					capabilities.push('measure_current.l1');
					if (data.include3phase) {
						capabilities.push('measure_current.l2');
						capabilities.push('measure_current.l3');
					}
					capabilities.push('measure_voltage.l1');
					if (data.include3phase) {
						capabilities.push('measure_voltage.l2');
						capabilities.push('measure_voltage.l3');
					}
				}
				if (data.includeOffPeak) {
					capabilities.push('meter_power.peak');
					capabilities.push('meter_power.offPeak');
				}
				if (data.includeProduction) {
					capabilities.push('meter_power.producedPeak');
				}
				if (data.includeProduction && data.includeOffPeak) {
					capabilities.push('meter_power.producedOffPeak');
				}
				capabilities.push('meter_power');	// always include meter_power
				if (data.includeGas) {
					capabilities.push('meter_gas');
				}

				const device = {
					name: `Smile_${data.smileId}`,
					data: { id: data.smileId },
					settings: {
						smileIp: smile.host,
						port: smile.port,
						smileId: data.smileId,
						ledring_usage_limit: 3000,
						ledring_production_limit: 3000,
					},
					capabilities,
				};
				return JSON.stringify(device); // report success to frontend
			}	catch (error) {
				this.error('Pair error', error);
				if (error.code === 'EHOSTUNREACH') {
					throw Error('Incorrect IP address');
				} else throw error;
			}
		});
	}

}

module.exports = Driver;
