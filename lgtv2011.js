'use strict';
var fs 				= require('fs'); // for storing client key
var utils 			= require(__dirname + '/lib/utils');
var adapter 		= utils.adapter('lgtv2011');
var LGTV            = require(__dirname + '/lib/api.js');
//var LGTV            = require('node-lgtv-api');

function RequestPairingKey(ip, port) 
{
	adapter.log.info('Requesting Pairing Key on TV: ' + adapter.config.ip);
	var lgtvobj = new LGTV(adapter.config.ip, adapter.config.port);
	lgtvobj.displayPairingKey(function (err) 
	{
		if (err) adapter.log.error('ERROR: ' + err);
    })
}

adapter.on('stateChange', function (id, state)
{
    if (id && state && !state.ack)
	{
		id = id.substring(adapter.namespace.length + 1);
	}
});

adapter.on('message', function (obj) 
{
	adapter.log.debug('Incoming Adapter message: ' + obj.command);
    switch (obj.command) 
	{
        case 'RequestPairingKey_Msg':
            if (!obj.callback) return false;
			RequestPairingKey(adapter.config.ip, adapter.config.port);
		return true;
		
        default:
            adapter.log.warn("Unknown command: " + obj.command);
		break;
    }
});



adapter.on('ready', main);

function main() 
{
	adapter.log.info('Ready. Configured TV IP: ' + adapter.config.ip);
    //adapter.subscribeStates('*');
}
