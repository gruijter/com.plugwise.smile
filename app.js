/*
Copyright 2016, 2017, 2018, Robin de Gruijter (gruijter@hotmail.com)

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
const Ledring = require('./ledring.js');
const Logger = require('./captureLogs.js');
// const SmileP1 = require('./smileP1.js');

class MyApp extends Homey.App {

	onInit() {
		this.log('Plugwise Smile P1 App is running!');
		this.ledring = new Ledring();
		this.logger = new Logger();	// [logName] [, logLength]

		process.on('unhandledRejection', (error) => {
			this.error('unhandledRejection! ', error);
		});
		Homey.on('unload', () => {
			this.log('app unload called');
			// save logs to persistant storage
			this.logger.saveLogs();
		});
		// testing stuff
		// this.smile = new SmileP1('', '');	// smileId, host, port
		// this.testSmile();
	}

	// ============================================================
	// logfile stuff for frontend API here
	deleteLogs() {
		return this.logger.deleteLogs();
	}
	getLogs() {
		return this.logger.logArray;
	}

	// ===================================================================
	// testing stuff here
	async testSmile() {
		try {
			// get the meter values
			const meter = await this.smile.getMeter();
			this.log(meter);
		}	catch (error) {
			this.log(error);
		}
	}

}

module.exports = MyApp;
