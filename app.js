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
			console.log(meter);
		}	catch (error) {
			console.log(error);
		}
	}

}

module.exports = MyApp;
