/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable prefer-destructuring */
/*
Copyright 2016 - 2022, Robin de Gruijter (gruijter@hotmail.com)

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
const Ledring = require('../../ledring.js');

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
					capabilities: [
						'measure_power',
						'meter_power',
						// 'measure_gas',
						// 'meter_gas',
						// 'meter_offPeak',
						// 'meter_power.peak',
						// 'meter_power.offPeak',
						// 'meter_power.producedPeak',
						// 'meter_power.producedOffPeak',
					],
				};
				if (data.includeOffPeak) {
					device.capabilities.push('meter_offPeak');
					device.capabilities.push('meter_power.peak');
					device.capabilities.push('meter_power.offPeak');
				}
				if (data.includeProduction) {
					device.capabilities.push('meter_power.producedPeak');
				}
				if (data.includeProduction && data.includeOffPeak) {
					device.capabilities.push('meter_power.producedOffPeak');
				}
				if (data.includeGas) {
					device.capabilities.push('measure_gas');
					device.capabilities.push('meter_gas');
				}
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
