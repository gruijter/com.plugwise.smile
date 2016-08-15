"use strict";

Homey.log("entering driver.js");

var ledring = require("../../ledring.js");
var devices = {};
var intervalId = {};

module.exports.init = function(devices_data, callback) {
    Homey.log("init in driver.js started");
    devices_data.forEach(initDevice);

    Homey.manager('flow').on('condition.offPeak', function( callback, args ){
      var result = devices[args.Smile.id].last_offPeak;
      Homey.log("condition flow requested, offPeak is: "+result);
      callback( null, result );
    });
    callback(null, true);
};

module.exports.pair = function(socket) {
    // Validate Smile connection data
    socket.on('validate', function (server_data, callback){
      validateConnection(server_data, function(error, result) {
        if (!error) {
          Homey.log('Pairing successful');
          callback(null, result);
        }
        if (error) {
          Homey.log('Pairing unsuccessful');
          callback( error, null );
        }
      });
    });

};

// the `added` method is called is when pairing is done and a device has been added for firmware 8.33+
module.exports.added = function( device_data, callback ) {
    Homey.log("initializing device ");
    Homey.log(device_data);
    initDevice( device_data );
    callback( null, true );
}

module.exports.deleted = function(device_data, callback) {
    Homey.log('Deleting ' + device_data.id);
    clearInterval(intervalId[device_data.id]); //end polling of device for readings
    setTimeout(function() {         //wait for running poll to end
      delete devices[device_data.id];
    },5000);
    callback(null, true);
};

module.exports.renamed = function( device_data, new_name ) {
    Homey.log(devices[device_data.id].name + ' has been renamed to ' + new_name);
    devices[device_data.id].name = new_name;
//    Homey.log(devices[device_data.id].name);
  };

module.exports.settings = function(device_data, newSettingsObj, oldSettingsObj, changedKeysArr, callback) {
	// run when the user has changed the device's settings in Homey.
	// changedKeysArr contains an array of keys that have been changed, for your convenience :)
  Homey.log(devices[device_data.id].name + ' has new settings for ' + changedKeysArr);


  Homey.log(device_data);
  Homey.log('old settings: ');
  Homey.log(oldSettingsObj);
  Homey.log('new settings: ')
  Homey.log(newSettingsObj);

//  changedKeysArr.forEach(function(item){
//    Homey.log(item + " old: "+oldSettingsObj[item]);
//    Homey.log(item + " new: "+newSettingsObj[item]);
//  });

  if ( parseInt(newSettingsObj.ledring_usage_limit) < 0 || !Number.isInteger(newSettingsObj.ledring_usage_limit) ||
       parseInt(newSettingsObj.ledring_production_limit) < 0 || !Number.isInteger(newSettingsObj.ledring_production_limit) ) {

    Homey.log('Ledring setting is invalid, ignoring new settings');
    callback( "Ledring settings must be a positive integer number", null ); //  settings must not be saved
    return
  };

  if (newSettingsObj.smileIp==oldSettingsObj.smileIp) {
    Homey.log('Storing new ledring settings');
    devices[device_data.id].ledring_usage_limit=newSettingsObj.ledring_usage_limit;
    devices[device_data.id].ledring_production_limit=newSettingsObj.ledring_production_limit;
    callback(null, true); 	// always fire the callback, or the settings won't change!
    return
  }

  else {
    validateConnection(newSettingsObj, function(error, result) {
      if (!error) {
        Homey.log('Storing new device settings');
        devices[device_data.id].smileIp=newSettingsObj.smileIp;
        devices[device_data.id].smileId=newSettingsObj.smileId;
        devices[device_data.id].ledring_usage_limit=newSettingsObj.ledring_usage_limit;
        devices[device_data.id].ledring_production_limit=newSettingsObj.ledring_production_limit;

        callback(null, true); 	// always fire the callback, or the settings won't change!
      }
      if (error) {
        Homey.log('Connection is invalid, ignoring new settings');
        callback( error, null ); //  settings must not be saved
      }

    });
  }
};


module.exports.capabilities = {
    measure_power: {
      get: function(device_data, callback) {
        var device = devices[device_data.id];
        callback(null, device.last_measure_power);
      }
    },

    meter_offPeak: {
      get: function(device_data, callback) {
        var device = devices[device_data.id];
        callback(null, device.last_offPeak);
      }
    },

    measure_gas: {
      get: function(device_data, callback) {
        var device = devices[device_data.id];
        callback(null, device.last_measure_gas);
      }
    },

    meter_gas: {
      get: function(device_data, callback) {
        var device = devices[device_data.id];
        callback(null, device.last_meter_gas);
      }
    },

    meter_power: {
      get: function(device_data, callback) {
        var device = devices[device_data.id];
        callback(null, device.last_meter_power);
      }
    }
/*
    ,
    "meter_power.peak": {
      get: function(device_data, callback) {
        var device = devices[device_data.id];
        callback(null, device.last_meter_power_peak);
      }
    },

    "meter_power.offPeak": {
      get: function(device_data, callback) {
        var device = devices[device_data.id];
        callback(null, device.last_meter_power_offpeak);
      }
    },

    "meter_power.producedPeak": {
      get: function(device_data, callback) {
        var device = devices[device_data.id];
        callback(null, device.last_meter_power_peak_produced);
      }
    },

    "meter_power.producedOffPeak": {
      get: function(device_data, callback) {
        var device = devices[device_data.id];
        callback(null, device.last_meter_power_offpeak_produced);
      }
    }
*/

};

function validateConnection(server_data, callback) {  // Validate Smile connection data
    Homey.log('Validating', server_data);

    var parseString = require('xml2js').parseString;
    var http = require('http');
    var options = {
        host: server_data.smileIp,
        port: 80,
        path: '/core/modules',
        auth: "smile" + ':' + server_data.smileId  //username is always smile
        };

    http.get(options, function(res){
        var body = "";
        res.on('data', function(data) {
            body += data;
        });

        res.on('end', function() {
            Homey.log(body);

            parseString(body, function (err, result) {
              //Homey.log(result); // check if xml/json data exists
              if (result != undefined) {
                if (result.modules.module[0].services[0] != undefined) {
                  Homey.log('Connecting successful!');
                  callback(null, result);
                  return;
                }
              }
              Homey.log('Error during connecting');
              callback(res.statusCode, null);
            })
        })

    }).on('error', function(err) {
          Homey.log("Got error: " + err.message);
          Homey.log('Error during connecting');
          callback(err, null);
        });
};   // end validate routine


function initDevice(device_data) {

  Homey.log("entering initDevice");

  //initDevice: retrieve device settings, buildDevice and start polling it
  module.exports.getSettings( device_data, function( err, settings ){
    if (err) {
      Homey.log("error retrieving device settings");
    } else {    // after settings received build the new device object
      Homey.log("retrieved settings are:");
      Homey.log(settings);

      //migration from old v0.9.8 app with no settings in device
      //obsolete, can be removed
      if (settings.smileId==undefined) {
        Homey.log("Migrating device from older app version");
        settings = {
          name: device_data.name,
          smileIp: device_data.smileIp,
          smileId: device_data.smileId,
          ledring_usage_limit: 3000,
          ledring_production_limit: 3000 };
        module.exports.setSettings( device_data, settings, function( err, settings ){
            // ... dunno what to do here, think nothing...
        })
      };

      buildDevice(device_data, settings);
      startPolling(device_data);
      createLog(device_data);
    }
  });

  //create new log for offPeak in Homey
  function createLog (device_data) {
    Homey.manager('insights').createLog( 'offPeak', {
        label: { en: 'Off-peak' , nl: 'Daltarief' },
        type: 'boolean',
        chart: 'stepLine'
      },
      function callback(err , success){
        if( err ) return Homey.error(err);
        Homey.manager('insights').createEntry( 'offPeak',
        devices[device_data.id].last_offPeak,
        new Date(), function(err, success){
          if( err ) return Homey.error(err);
        })
      });
    };


  function buildDevice (device_data, settings){
    devices[device_data.id] = {
      id         : device_data.id,
      name       : settings.name,
      smileIp    : settings.smileIp,
      smileId    : settings.smileId,
      ledring_usage_limit               : settings.ledring_usage_limit,
      ledring_production_limit          : settings.ledring_production_limit,
      last_measure_gas                  : 0,    //"measure_gas" (m3)
      last_meter_gas                    : 0,    //"meter_gas" (m3)
      last_measure_power                : 0,    //"measure_power" (W)
      last_meter_power                  : 0,    //"meter_power" (Wh)
      last_meter_power_peak             : 0,    //"meter_power_peak" (Wh) capability to be added
      last_meter_power_offpeak          : 0,    //"meter_power_offpeak" (Wh) capability to be added
      last_meter_power_peak_produced    : 0,    //"meter_power_peak_produced" (Wh) capability to be added
      last_meter_power_offpeak_produced : 0,    //"meter_power_offpeak_produced" (Wh) capability to be added
      last_measure_power_produced       : 0,    // "measure_power_produced" (W) capability to be added
      last_interval_timestamp           : "",   // e.g. "2016-05-31T17:45:00+02:00" timestamp of 5 minutes interval reading
      last_offPeak                      : true, //"meter_power_offpeak" (true/false) capability to be added
      readings                          : {},   //or device_data.readings
      homey_device                      : device_data // device_data object from moment of pairing
    };
    Homey.log("init buildDevice is: " );
    Homey.log(devices[device_data.id] );
  }

  function startPolling(device_data){     //start polling device for readings every 10 seconds
    intervalId[device_data.id] = setInterval(function () {
      checkProduction(devices[device_data.id], function(response){
          //reserved for callback
        })
      }, 10000);
  }

}//end of initDevice


function checkProduction(device_data, callback) {

// Homey.log("checking production for "+device_data)

  var parseString = require('xml2js').parseString;
  var http = require('http');
  var options = {
      host: device_data.smileIp,
      port: 80,
      path: '/core/modules',
      auth: "smile" + ':' + device_data.smileId  //username is always smile
      };

  http.get(options, function(res){
      var body = "";
      res.on('data', function(data) {
          body += data;
      });

      res.on('end', function() {
          //Homey.log(body);

          parseString(body, function (err, result) {

            if (result != undefined) {      // check if json data exists
              if (result.modules.module[0].services[0]!=undefined) {     // check if json data has correct structure
                Homey.log('New smile data received');
                module.exports.setAvailable(devices[device_data.id].homey_device);
                device_data.readings=result;
                storeNewReadings(device_data);
                callback(); // no need for callback I think.....
                return;
              }
            }
            Homey.log('Error reading smile');
            module.exports.setUnavailable(devices[device_data.id].homey_device, err );
          })
    })

  }).on('error', function(err) {
        Homey.log("Got error: " + err.message);
        Homey.log('Error reading smile');
        module.exports.setUnavailable(devices[device_data.id].homey_device, err.message);
      });
}


function storeNewReadings ( device_data ) {
  //Homey.log("storing new readings");

// mapping unknown data structure caused by different smart meter brands
  function mapMeter (meterName) {
    if (Object.getOwnPropertyDescriptor(device_data.readings.modules.module[0].services[0], meterName) != undefined) {
      return Object.getOwnPropertyDescriptor(device_data.readings.modules.module[0].services[0], meterName).value
      } else
    if (Object.getOwnPropertyDescriptor(device_data.readings.modules.module[1].services[0], meterName) != undefined) {
      return Object.getOwnPropertyDescriptor(device_data.readings.modules.module[1].services[0], meterName).value
      } else
      Homey.log("Error in mapping of P1 meter data");
    return false
  }

// gas readings from device
  if (device_data.readings.modules.module[1] != undefined) {            // check if second meter is present, otherwise no gasmeter
    //Homey.log("gasmeter present");
    var gas_interval_meter         = mapMeter('gas_interval_meter');
    var gas_cumulative_meter       = mapMeter('gas_cumulative_meter');

    var gas_interval_meter = Number(gas_interval_meter[0].measurement[0]._) ; //gas_interval_meter (1h)
    var meter_gas = Number(gas_cumulative_meter[0].measurement[0]._); //gas_cumulative_meter
  } else {
    //Homey.log("no gasmeter present");
    var gas_interval_meter = 0;
    var meter_gas = 0;
  }

// electricity readings from device
  var electricity_cumulative_meter = mapMeter('electricity_cumulative_meter');
  var electricity_point_meter      = mapMeter('electricity_point_meter');
  var electricity_interval_meter   = mapMeter('electricity_interval_meter');

  var electricity_point_meter_produced = Number(electricity_point_meter[0].measurement[0]._); //electricity_point_meter_produced
  var electricity_point_meter_consumed = Number(electricity_point_meter[0].measurement[1]._); //electricity_point_meter_consumed

  var electricity_interval_meter_offpeak_produced = Number(electricity_interval_meter[0].measurement[0]._); //electricity_interval_meter_offpeak_produced (5min)
  var electricity_interval_meter_peak_produced = Number(electricity_interval_meter[0].measurement[1]._); //electricity_interval_meter_peak_produced (5min)
  var electricity_interval_meter_offpeak_consumed = Number(electricity_interval_meter[0].measurement[2]._); //electricity_interval_meter_offpeak_consumed (5min)
  var electricity_interval_meter_peak_consumed = Number(electricity_interval_meter[0].measurement[3]._); //electricity_interval_meter_peak_consumed (5min)
  var interval_timestamp = electricity_cumulative_meter[0].measurement[0].$.log_date; //electricity_interval_meter timestamp (5min)

  var electricity_cumulative_meter_offpeak_produced = Number(electricity_cumulative_meter[0].measurement[0]._)/1000 ; //electricity_cumulative_meter_offpeak_produced
  var electricity_cumulative_meter_peak_produced = Number(electricity_cumulative_meter[0].measurement[1]._)/1000 ; //electricity_cumulative_meter_peak_produced
  var electricity_cumulative_meter_offpeak_consumed = Number(electricity_cumulative_meter[0].measurement[2]._)/1000 ; //electricity_cumulative_meter_offpeak_consumed
  var electricity_cumulative_meter_peak_consumed = Number(electricity_cumulative_meter[0].measurement[3]._)/1000 ; //electricity_cumulative_meter_peak_consumed

//constructed readings
  var meter_power = (electricity_cumulative_meter_offpeak_consumed + electricity_cumulative_meter_peak_consumed - electricity_cumulative_meter_offpeak_produced - electricity_cumulative_meter_peak_produced);
  var measure_power = (electricity_point_meter_consumed - electricity_point_meter_produced);
  var measure_power_produced = device_data.last_measure_power_produced;
  var measure_power_delta = measure_power - device_data.last_measure_power;
  var offPeak = (electricity_interval_meter_offpeak_produced>0 || electricity_interval_meter_offpeak_consumed>0 );

  //correct measure_power for weird meter readings during production period with short peak in power use
//  if (measure_power<=40 && device_data.last_measure_power_produced>100) {
//    measure_power = 0;
//  } ;

  //measure_power_produced 5 minutes average
  if (interval_timestamp != device_data.last_interval_timestamp && device_data.last_interval_timestamp != "") {
    measure_power_produced= 12000*(electricity_cumulative_meter_offpeak_produced + electricity_cumulative_meter_peak_produced - device_data.last_meter_power_offpeak_produced - device_data.last_meter_power_peak_produced);
  };

 //correct measure_power with average measure_power_produced in case point_meter_produced is always zero
  if (measure_power==0 && electricity_point_meter_produced==0) {
    measure_power = 0 - measure_power_produced;
  };

  //Homey.log(device_data.last_offPeak);
  if (offPeak != device_data.last_offPeak) {
    //test new custom capabilities logging / flows
    module.exports.realtime(devices[device_data.id].homey_device, "meter_offpeak", offPeak);

    // Trigger flow for tariff_changed
    Homey.manager('flow').triggerDevice('tariff_changed', {
      tariff: offPeak
      },
      null,
      devices[device_data.id].homey_device
    );

    // log new value for Insights
    Homey.manager('insights').createEntry( 'offPeak',
    offPeak,
    new Date(), function(err, success){
      if( err ) return Homey.error(err);
      }
    )
  };


//  Homey.log(measure_power);
  if (measure_power != device_data.last_measure_power) {
    //Homey.log.log(measure_power_delta);
    module.exports.realtime(devices[device_data.id].homey_device, "measure_power", measure_power);
// Trigger flow for power_changed
    Homey.manager('flow').triggerDevice('power_changed', {
      power: measure_power,
      power_delta: measure_power_delta
    },
      null,
      devices[device_data.id].homey_device
    );
//adapt ledring to match
      ledring.change(devices[device_data.id], measure_power, function (returntext) {
        //reseved for callback;
      //  Homey.log("coming back "+returntext);
      });
  };


//  Homey.log(meter_power);
  if (meter_power != device_data.last_meter_power) {
    module.exports.realtime(devices[device_data.id].homey_device, "meter_power", meter_power)
  }

//  Homey.log(meter_gas);
//  Homey.log(gas_interval_meter);
  if (meter_gas != device_data.last_meter_gas) {
    module.exports.realtime(devices[device_data.id].homey_device, "meter_gas", meter_gas);
    //test new custom capabilities logging / flows
    module.exports.realtime(devices[device_data.id].homey_device, "measure_gas", gas_interval_meter);
  };

  device_data.last_interval_timestamp           = interval_timestamp;
  device_data.last_meter_power_peak             = electricity_cumulative_meter_peak_consumed;
  device_data.last_meter_power_offpeak          = electricity_cumulative_meter_offpeak_consumed;
  device_data.last_meter_power_peak_produced    = electricity_cumulative_meter_peak_produced;
  device_data.last_meter_power_offpeak_produced = electricity_cumulative_meter_offpeak_produced;
  device_data.last_measure_power                = measure_power;
  device_data.last_measure_power_produced       = measure_power_produced;
  device_data.last_meter_power                  = meter_power;
  device_data.last_measure_gas                  = gas_interval_meter;
  device_data.last_meter_gas                    = meter_gas;
  device_data.last_offPeak                      = offPeak;


  //Homey.log(device_data);

}
