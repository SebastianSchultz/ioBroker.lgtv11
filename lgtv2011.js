'use strict';
var fs 				= require('fs'); // for storing client key
var utils 			= require(__dirname + '/lib/utils');
var adapter 		= utils.adapter('lgtv2011');
var LGTV            = require('node-lgtv-api');
var pollTimerChannel       = null;
var pollTimerOnlineStatus       = null;
var pollTimerInput       = null;

function RequestPairingKey(ip) {
	adapter.log.debug('Requesting Pairing Key on TV: ' + adapter.config.ip);
	var lgtvobj = new LGTV(adapter.config.ip, adapter.config.port);
	lgtvobj.displayPairingKey(function (err) {
		if (err) 
			adapter.log.debug('ERROR: ' + err);
    })
}

adapter.on('stateChange', function (id, state)
{
    if (id && state && !state.ack)
	{
		id = id.substring(adapter.namespace.length + 1);
	}
});

function onMessage (obj) {
    if (!obj) return;

    function reply(result) {
        adapter.sendTo (obj.from, obj.command, JSON.stringify(result), obj.callback);
    }

    switch (obj.command) {
        case 'RequestPairingKey_Msg':
            if (!obj.callback) return false;
			RequestPairingKey(adapter.config.ip);
            return true;
        default:
            adapter.log.warn("Unknown command: " + obj.command);
            break;
    }
    if (obj.callback) adapter.sendTo (obj.from, obj.command, obj.message, obj.callback);
    return true;
}

adapter.on('ready', main);

function main() 
{
	adapter.log.info('Ready. Configured TV IP: ' + adapter.config.ip);
    //adapter.subscribeStates('*');
	//if (parseInt(adapter.config.interval, 10)) {
//		pollTimerChannel = setInterval(pollChannel, parseInt(adapter.config.interval, 10));
//		pollTimerOnlineStatus = setInterval(pollOnlineStatus, parseInt(adapter.config.interval, 10));
//		pollTimerInput = setInterval(pollInput, parseInt(adapter.config.interval, 10));
//	}
}
