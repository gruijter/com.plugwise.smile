'use strict';

const Homey = require('homey');
const Ledring = require('./ledring.js');
const fs = require('fs');
const StdOutFixture = require('fixture-stdout');
// const SmileP1 = require('./smileP1.js');

class MyApp extends Homey.App {

	onInit() {
		this.initLogCapture();
		this.log('Plugwise Smile P1 App is running!');
		this.ledring = new Ledring();

		process.on('unhandledRejection', (error) => {
			this.error('unhandledRejection! ', error);
		});
		Homey.on('unload', () => {
			this.log('app unload called');
			// save logs to persistant storage
			this.setLogFile();
		});

		// this.smile = new SmileP1('', '');	// smileId, host, port
		// this.testSmile();
	}

	// capture all logs for frontend
	initLogCapture(logLength, logName) {
		logLength = logLength || 50;
		logName = logName || 'log';
		const logFile = `/userdata/${logName}.json`;
		this.logArray = [];
		this.getLogFile = () => {
			fs.readFile(logFile, 'utf8', (err, data) => {
				if (err) {
					this.log('error reading logfile: ', err);
					return [];
				}
				try {
					this.logArray = JSON.parse(data);
					// console.log(this.logArray);
				} catch (error) {
					this.log('error parsing logfile: ', error);
					return [];
				}
				return this.logArray;
			});
		};
		this.setLogFile = () => {
			fs.writeFile(logFile, JSON.stringify(this.logArray), (err) => {
				if (err) {
					this.log('error writing logfile: ', err);
				} else {
					this.log('logfile saved');
				}
			});
		};
		// load logFile into memory
		this.getLogFile();
		// provide logs function for frontend api
		this.getLogs = () => {
			// this.log('getting logs for frontend');
			return this.logArray;
		};
		// Capture all writes to stdout (e.g. this.log)
		const captureStdout = new StdOutFixture({ stream: process.stdout });
		captureStdout.capture((string) => {
			if (this.logArray.length >= this.logLength) {
				this.logArray.shift();
			}
			this.logArray.push(string);
			// return false;	// prevent the write to the original stream
		});
		// captureStdout.release();
		// Capture all writes to stderr (e.g. this.error)
		const captureStderr = new StdOutFixture({ stream: process.stderr });
		captureStderr.capture((string) => {
			if (this.logArray.length >= this.logLength) {
				this.logArray.shift();
			}
			this.logArray.push(string);
			// return false;	// prevent the write to the original stream
		});
		// captureStderr.release();
	}

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
