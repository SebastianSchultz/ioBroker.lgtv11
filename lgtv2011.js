'use strict';
var fs 				= require('fs'); // for storing client key
var utils 			= require(__dirname + '/lib/utils');
var adapter 		= utils.adapter('lgtv2011');

var dgram = require('dgram');
var http = require('http');
var net = require('net');

var device_is2012 = false;
var device_is2011 = false;
var device_is2010 = false;

var pollTimerChannel = null;

function RequestPairingKey(ip, port) 
{
	adapter.log.info('Requesting Pairing Key on TV: ' + adapter.config.ip + '...');

	device_is2012 = (adapter.config.model === '2012');
	device_is2011 = (adapter.config.model === '2011');
	device_is2010 = (adapter.config.model === '2010');
	if (device_is2010)
		var reqpath  = '/udap/api/pairing';
	if (device_is2011)
		var reqpath  = '/hdcp/api/auth';
	if (device_is2012)
		var reqpath  = '/roap/api/auth';

	var message_request = '<?xml version="1.0" encoding="utf-8"?>' +
		'<auth><type>AuthKeyReq</type></auth>';

	var options = {
		hostname : adapter.config.ip,
		port : 8080,
		path : reqpath,
		method : 'POST'
	};

	adapter.log.info('Requesting Pairing Key on TV: ' + adapter.config.ip + ' with HTTP request: ' + message_request);

	var req = http.request(options, function (res) 
	{
		if(res.statusCode == 200) 
			adapter.log.debug('The Pairing Key is being displayed on the TV screen.')
		else 
			adapter.log.error('HTTP Request Error: ' + res.statusCode + ' (statusCode)');
	});
	req.on('error', function (error) 
	{
		adapter.log.error('Request Error: ' + error);
	});
	req.setHeader('Content-Type', 'text/xml; charset=utf-8');
	req.end(message_request);
}

adapter.on('stateChange', function (id, state)
{
    if (id && state && !state.ack)
	{
		id = id.substring(adapter.namespace.length + 1);
		switch (id)
		{
			case 'turnOff':
				adapter.log.debug('Starting state change "' + id + '", value "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
				getSessionId (adapter.config.ip, adapter.config.pairingkey, function (dev, sessionKey) 
				{
					handleCommand (adapter.config.ip, adapter.config.pairingkey, 'power_off', function (dev_, result) 
					{
						adapter.log.debug('RESULT: ' + result);
					});
				});			
			break;
			
			case 'volumeUp':
				adapter.log.debug('Starting state change "' + id + '", value "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
				getSessionId (adapter.config.ip, adapter.config.pairingkey, function (dev, sessionKey) 
				{
					handleCommand (adapter.config.ip, adapter.config.pairingkey, 'audio_volume_up', function (dev_, result) 
					{
						adapter.log.debug('RESULT: ' + result);
					});
				});			
			break;
			
			case 'volumeDown':
				var lgtvobj = new TvApi(adapter.config.ip, adapter.config.port, adapter.config.pairingkey);
				adapter.log.debug('Starting state change "' + id + '", value "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
				lgtvobj.authenticate(function (err, sessionKey) {
					adapter.log.debug('Sending authentication request with pairing key "' + adapter.config.pairingkey + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
					if (err) 
						adapter.log.error('ERROR on sending authentication request with pairing key "' + adapter.config.pairingkey + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
					else 
					{
						adapter.log.debug('Sending volumeDown message "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
						lgtvobj.processCommand(lgtvobj.TV_CMD_VOLUME_DOWN, [], function (err, data) {
							if (err) 
								adapter.log.error('ERROR on sending volumeDown message "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
							else 
							{
								adapter.setState('volumeDown', !!state.val, true);
								adapter.log.debug('Success in sending volumeDown message "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
							}
						});
					}
				});	
			break;
			
			case 'mute':
				var lgtvobj = new TvApi(adapter.config.ip, adapter.config.port, adapter.config.pairingkey);
				adapter.log.debug('Starting state change "' + id + '", value "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
				lgtvobj.authenticate(function (err, sessionKey) {
					adapter.log.debug('Sending authentication request with pairing key "' + adapter.config.pairingkey + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
					if (err) 
						adapter.log.error('ERROR on sending authentication request with pairing key "' + adapter.config.pairingkey + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
					else 
					{
						adapter.log.debug('Sending mute message "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
						lgtvobj.processCommand(lgtvobj.TV_CMD_MUTE_TOGGLE, [], function (err, data) {
							if (err) 
								adapter.log.error('ERROR on sending mute message "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
							else 
							{
								adapter.setState('mute', !!state.val, true);
								adapter.log.debug('Success in sending mute message "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
							}
						});
					}
				});	
			break;
			
			case 'channelUp':
				var lgtvobj = new TvApi(adapter.config.ip, adapter.config.port, adapter.config.pairingkey);
				adapter.log.debug('Starting state change "' + id + '", value "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
				lgtvobj.authenticate(function (err, sessionKey) {
					adapter.log.debug('Sending authentication request with pairing key "' + adapter.config.pairingkey + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
					if (err) 
						adapter.log.error('ERROR on sending authentication request with pairing key "' + adapter.config.pairingkey + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
					else 
					{
						adapter.log.debug('Sending channelUp message "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
						lgtvobj.processCommand(lgtvobj.TV_CMD_CHANNEL_UP, [], function (err, data) {
							if (err) 
								adapter.log.error('ERROR on sending channelUp message "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
							else 
							{
								adapter.setState('channelUp', !!state.val, true);
								adapter.log.debug('Success in sending channelUp message "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
							}
						});
					}
				});				
			break;			

			case 'channelDown':
				var lgtvobj = new TvApi(adapter.config.ip, adapter.config.port, adapter.config.pairingkey);
				adapter.log.debug('Starting state change "' + id + '", value "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
				lgtvobj.authenticate(function (err, sessionKey) {
					adapter.log.debug('Sending authentication request with pairing key "' + adapter.config.pairingkey + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
					if (err) 
						adapter.log.error('ERROR on sending authentication request with pairing key "' + adapter.config.pairingkey + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
					else 
					{
						adapter.log.debug('Sending channelDown message "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
						lgtvobj.processCommand(lgtvobj.TV_CMD_CHANNEL_DOWN, [], function (err, data) {
							if (err) 
								adapter.log.error('ERROR on sending channelDown message "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
							else 
							{
								adapter.setState('channelDown', !!state.val, true);
								adapter.log.debug('Success in sending channelDown message "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
							}
						});
					}
				});				
			break;			
		}
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
	device_is2012 = (adapter.config.model === '2012');
	device_is2011 = (adapter.config.model === '2011');
	device_is2010 = (adapter.config.model === '2010');

	if (device_is2012)
		var Model = '2012'
	else if (device_is2011)
		var Model = '2011'
	else Model = '2010';
	adapter.log.info('Ready. Configured LG TV IP: ' + adapter.config.ip + ', Port: ' + adapter.config.port + ', Pairing Key: ' + adapter.config.pairingkey + ', Model: ' + Model);
    adapter.subscribeStates('*');
	if (parseInt(adapter.config.interval, 10)) 
	{
//		pollTimerChannel = setInterval(pollChannel, parseInt(adapter.config.interval, 10));
	}
}