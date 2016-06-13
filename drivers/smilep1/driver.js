"use strict";

Homey.log("entering driver.js");

var ledRing = require("../../ledring.js");
var devices = {};
var intervalId = {};

module.exports.init = function(devices_data, callback) {
    Homey.log("init in driver.js started");

    devices_data.forEach(initDevice);

    Homey.manager('flow').on('condition.offPeak', function( callback, args ){
      var result = devices[args.Smile.id].last_offPeak;
    //  Homey.log("condition flow requested, offPeak is: "+result);
      callback( null, result );
    });

    callback(null, true);
};

module.exports.pair = function(socket) {
    // Validate Smile data
    socket.on('validate', function( server_data, callback ){
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
                      Homey.log('Pairing successful!');
                      callback(null, result);
                      return;
                    }
                  }
                  Homey.log('Error during pairing');
                  callback(res.statusCode, null);
                })
            })

        }).on('error', function(err) {
              Homey.log("Got error: " + err.message);
              Homey.log('Error during pairing');
              callback(err, null);
            });
    });   // end validate routine

    socket.on('add_device', function( data_init, callback ){
        initDevice(data_init);
        callback(null, true);
    });
};

module.exports.deleted = function(device_data, callback) {
    Homey.log('Deleting ' + device_data.id);
    clearInterval(intervalId[device_data.id]); //end polling of device for readings
    delete devices[device_data.id];
};

module.exports.renamed = function( device_data, new_name ) {
    Homey.log(devices[device_data.id].name + ' has been renamed to ' + new_name);
    devices[device_data.id].name = new_name;
//    Homey.log(devices[device_data.id].name);
  }


module.exports.capabilities = {
    measure_power: {
        get: function(device_data, callback) {
            var device = devices[device_data.id];
            callback(null, device.last_measure_power);
        }
    },

    meter_power: {
        get: function(device_data, callback) {
            var device = devices[device_data.id];
//            Homey.log("get meter_power "+ device.last_meter_power);
            callback(null, device.last_meter_power);
        }
    },

    meter_gas: {
        get: function(device_data, callback) {
            var device = devices[device_data.id];
            callback(null, device.last_meter_gas);
        }
    }

};

function initDevice(device_data) {

    Homey.log("entering initDevice");

    devices[device_data.id] = {
            id         : device_data.id,
            name       : device_data.name,
            smileIp    : device_data.smileIp,
            smileId    : device_data.smileId,
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

    Homey.log(devices[device_data.id] );

    //start polling device for readings every 10 seconds
    intervalId[device_data.id] = setInterval(function () {
      checkProduction(devices[device_data.id], function(response){
          //reserved for callback
        })
      }, 10000);

}


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
  Homey.log("storing new readings");

  function mapMeter (meterName) {
    if (Object.getOwnPropertyDescriptor(device_data.readings.modules.module[0].services[0], meterName) != undefined) {
      return Object.getOwnPropertyDescriptor(device_data.readings.modules.module[0].services[0], meterName).value
      } else
    if (Object.getOwnPropertyDescriptor(device_data.readings.modules.module[1].services[0], meterName) != undefined) {
      return Object.getOwnPropertyDescriptor(device_data.readings.modules.module[1].services[0], meterName).value
      } else
      console.log("Error in mapping of P1 meter data");
    return false
  }

// mapping unknown data structure caused by different smart meter brands
  var electricity_cumulative_meter = mapMeter('electricity_cumulative_meter');
  var electricity_point_meter      = mapMeter('electricity_point_meter');
  var electricity_interval_meter   = mapMeter('electricity_interval_meter')
  var gas_interval_meter           = mapMeter('gas_interval_meter')
  var gas_cumulative_meter         = mapMeter('gas_cumulative_meter')


//readings from device
  var electricity_point_meter_produced = Number(electricity_point_meter[0].measurement[0]._); //electricity_point_meter_produced
  var electricity_point_meter_consumed = Number(electricity_point_meter[0].measurement[1]._); //electricity_point_meter_consumed

  var electricity_interval_meter_offpeak_produced = Number(electricity_interval_meter[0].measurement[0]._); //electricity_interval_meter_offpeak_produced (5min)
  var electricity_interval_meter_peak_produced = Number(electricity_interval_meter[0].measurement[1]._); //electricity_interval_meter_peak_produced (5min)
  var electricity_interval_meter_offpeak_consumed = Number(electricity_interval_meter[0].measurement[2]._); //electricity_interval_meter_offpeak_consumed (5min)
  var electricity_interval_meter_peak_consumed = Number(electricity_interval_meter[0].measurement[3]._); //electricity_interval_meter_peak_consumed (5min)
  var interval_timestamp = electricity_cumulative_meter[0].measurement[0].$.log_date; //electricity_interval_meter timestamp (5min)

  var electricity_cumulative_meter_offpeak_produced = Number(electricity_cumulative_meter[0].measurement[0]._);//1000 ; //electricity_cumulative_meter_offpeak_produced
  var electricity_cumulative_meter_peak_produced = Number(electricity_cumulative_meter[0].measurement[1]._);//1000 ; //electricity_cumulative_meter_peak_produced
  var electricity_cumulative_meter_offpeak_consumed = Number(electricity_cumulative_meter[0].measurement[2]._);//1000 ; //electricity_cumulative_meter_offpeak_consumed
  var electricity_cumulative_meter_peak_consumed = Number(electricity_cumulative_meter[0].measurement[3]._);//1000 ; //electricity_cumulative_meter_peak_consumed

  var gas_interval_meter = Number(gas_interval_meter[0].measurement[0]._) ; //gas_interval_meter (1h)
  var meter_gas = Number(gas_cumulative_meter[0].measurement[0]._); //gas_cumulative_meter

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
    measure_power_produced= 12*(electricity_cumulative_meter_offpeak_produced + electricity_cumulative_meter_peak_produced - device_data.last_meter_power_offpeak_produced - device_data.last_meter_power_peak_produced);
  };

  //correct measure_power with average measure_power_produced in case point_meter_produced is always zero
  if (measure_power==0 && electricity_point_meter_produced==0) {
    measure_power = 0 - measure_power_produced;
  };


  // Homey.log(device_data.last_offPeak);
  if (offPeak != device_data.last_offPeak) {
    // Trigger flow for tariff_changed
    Homey.manager('flow').triggerDevice('tariff_changed', {
      tariff: device_data.last_offPeak
      },
      null,
      devices[device_data.id].homey_device
    );
  };


//  Homey.log(measure_power);
  if (measure_power != device_data.last_measure_power) {
    module.exports.realtime(devices[device_data.id].homey_device, "measure_power", measure_power);
// Trigger flow for power_changed
    Homey.manager('flow').triggerDevice('power_changed', {
      power: measure_power,
      power_delta: measure_power_delta
    },
      null,
      devices[device_data.id].homey_device
    );
//adapt ledRing to match
      ledRing.change(measure_power, function (returntext) {
        //reseved for callback;
      //  Homey.log("coming back "+returntext);
      });
  };


//  Homey.log(meter_power);
  if (meter_power != device_data.last_meter_power) {
    module.exports.realtime(devices[device_data.id].homey_device, "meter_power", meter_power)
  }

//  Homey.log(meter_gas);
  if (meter_gas != device_data.last_meter_gas) {
    module.exports.realtime(devices[device_data.id].homey_device, "meter_gas", meter_gas)
  }


  device_data.last_interval_timestamp           = interval_timestamp;
  device_data.last_meter_power_peak             = electricity_cumulative_meter_peak_consumed;
  device_data.last_meter_power_offpeak          = electricity_cumulative_meter_offpeak_consumed;
  device_data.last_meter_power_peak_produced    = electricity_cumulative_meter_peak_produced;
  device_data.last_meter_power_offpeak_produced = electricity_cumulative_meter_offpeak_produced;
  device_data.last_measure_power                = measure_power;
  device_data.last_measure_power_produced       = measure_power_produced;
  device_data.last_meter_power                  = meter_power;
  device_data.last_meter_gas                    = meter_gas;
  device_data.last_offPeak                      = offPeak;


  //Homey.log(device_data);

}
