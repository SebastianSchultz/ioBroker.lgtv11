/* jshint -W097 */
/* jshint strict:false */
/* global require */
/* global RRule */
/* global __dirname */
/* jslint node: true */
'use strict';

var fs 				= require('fs'); // for storing client key
var utils = require('@iobroker/adapter-core');
var adapter;

var dgram = require('dgram');
var http = require('http');
var net = require('net');

var pollTimerChannel = null;

if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
} 

var commands = {
	"3Dmode": 400,
	"turnOff": 1,
	"back": 23,
	"volumeUp": 24,
	"volumeDown": 25,
	"mute": 26,
	"channelUp": 27,
	"channelDown": 28,
	"input": 47,
	"number0": 2,
	"number1": 3,
	"number2": 4,
	"number3": 5,
	"number4": 6,
	"number5": 7,
	"number6": 8,
	"number7": 9,
	"number8": 10,
	"number9": 11,
	"ok": 20,
	"up": 12,
	"down": 13,
	"left": 14,
	"right": 15,
	"play": 33,
	"pause": 34,
	"stop": 35
}

function RequestPairingKey(ip, port) 
{
	adapter.log.info('Requesting Pairing Key on TV: ' + adapter.config.ip + '...');

	var message_request = '<?xml version="1.0" encoding="utf-8"?>' +
		'<auth><type>AuthKeyReq</type></auth>';

	var options = {
		hostname : adapter.config.ip,
		port : 8080,
		path : '/roap/api/auth',
		method : 'POST'
	};

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

function RequestSessionKey(pairingKey, callback) 
{
	adapter.log.debug('Starting RequestSessionKey on TV: ' + adapter.config.ip + ' with pairing key ' + pairingKey);

	var message_request = '<?xml version="1.0" encoding="utf-8"?>' +
		'<auth><type>AuthReq</type><value>' +
		pairingKey + '</value></auth>';
		
	var options = {
		hostname : adapter.config.ip,
		port : 8080,
		path : '/roap/api/auth',
		method : 'POST'
	};

	var req = http.request(options, function (res) 
	{
		if(res.statusCode == 200) 
		{
			adapter.log.debug('SUCCESS: The Pairing request on LG TV has succeeded.')
			res.on('data', function(data)
			{
				adapter.log.debug('RequestSessionKey HTTP Response: ' + data);
				callback(data);
			});
		}
		else 
		{
			adapter.log.error('Error on RequestSessionKey ' + res.statusCode + ' (statusCode)');
			callback(false);
		}
	});

	req.on('error', function (error) 
	{
		adapter.log.error('Error: on RequestSessionKey ' + error);
	});

	req.setHeader('Content-Type', 'text/xml; charset=utf-8');
	req.end(message_request);
}

function RequestCommand(sessionID, commandKey) 
{
	var message_request = '<?xml version="1.0" encoding="utf-8"?><command><session>' +
		sessionID +
		"</session><type>HandleKeyInput</type><value>" +
		commandKey +
		"</value></command>"

	var options = {
		hostname : adapter.config.ip,
		port : 8080,
		path : '/roap/api/command',
		method : 'POST'
	};

	var req = http.request(options, function (res) 
	{
		if(res.statusCode != 200) 
		{
			adapter.log.error('Error HTTP Request RequestCommand "' + commandKey + '": ' + res.statusCode + ' (statusCode)');
		}
	});
	
	req.on('error', function (error) 
	{
		adapter.log.error('Error RequestCommand: ' + error);
	});
	
	req.setHeader('Content-Type', 'text/xml; charset=utf-8');
	req.end(message_request);
}

function startAdapter(options) {
    options = options || {};
    Object.assign(options,{
        name:  "lgtv11",
        stateChange:  function (id, state) {
            if (id && state && !state.ack)
			{
				id = id.substring(adapter.namespace.length + 1);
				if(typeof commands[id] != "undefined")
				{
					adapter.log.debug('Starting state change "' + id + '", value "' + state.val + '" to LG TV at ' + adapter.config.ip + ' on port ' + adapter.config.port);
					RequestSessionKey(adapter.config.pairingkey, function (data) 
					{
						if(data)
						{
							adapter.log.debug('RequestCommand, Data response after RequestSessionKey: ' + data);
							RequestCommand(data, commands[id]);
							adapter.setState(id, !!state.val, true);
						} else adapter.log.debug('RequestCommand, No Data response after RequestSessionKey!');
					});
				}
			}
        },
        unload: function (callback) {
            callback();
        },
        ready: function () {
            main();
        }
    });

    adapter = new utils.Adapter(options);

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

    return adapter;
}

function main() 
{
	adapter.log.info('Ready. Configured LG TV IP: ' + adapter.config.ip + ', Port: ' + adapter.config.port + ', Pairing Key: ' + adapter.config.pairingkey);
    adapter.subscribeStates('*');
	if (parseInt(adapter.config.interval, 10)) 
	{
//		pollTimerChannel = setInterval(pollChannel, parseInt(adapter.config.interval, 10));
	}
}

/*
LgTvApi.prototype.TV_CMD_POWER = 1;
LgTvApi.prototype.TV_CMD_NUMBER_0 = 2;
LgTvApi.prototype.TV_CMD_NUMBER_1 = 3;
LgTvApi.prototype.TV_CMD_NUMBER_2 = 4;
LgTvApi.prototype.TV_CMD_NUMBER_3 = 5;
LgTvApi.prototype.TV_CMD_NUMBER_4 = 6;
LgTvApi.prototype.TV_CMD_NUMBER_5 = 7;
LgTvApi.prototype.TV_CMD_NUMBER_6 = 8;
LgTvApi.prototype.TV_CMD_NUMBER_7 = 9;
LgTvApi.prototype.TV_CMD_NUMBER_8 = 10;
LgTvApi.prototype.TV_CMD_NUMBER_9 = 11;
LgTvApi.prototype.TV_CMD_UP = 12;
LgTvApi.prototype.TV_CMD_DOWN = 13;
LgTvApi.prototype.TV_CMD_LEFT = 14;
LgTvApi.prototype.TV_CMD_RIGHT = 15;
LgTvApi.prototype.TV_CMD_OK = 20;
LgTvApi.prototype.TV_CMD_HOME_MENU = 21;
LgTvApi.prototype.TV_CMD_BACK = 23;
LgTvApi.prototype.TV_CMD_VOLUME_UP = 24;
LgTvApi.prototype.TV_CMD_VOLUME_DOWN = 25;
LgTvApi.prototype.TV_CMD_MUTE_TOGGLE = 26;
LgTvApi.prototype.TV_CMD_CHANNEL_UP = 27;
LgTvApi.prototype.TV_CMD_CHANNEL_DOWN = 28;
LgTvApi.prototype.TV_CMD_BLUE = 29;
LgTvApi.prototype.TV_CMD_GREEN = 30;
LgTvApi.prototype.TV_CMD_RED = 31;
LgTvApi.prototype.TV_CMD_YELLOW = 32;
LgTvApi.prototype.TV_CMD_PLAY = 33;
LgTvApi.prototype.TV_CMD_PAUSE = 34;
LgTvApi.prototype.TV_CMD_STOP = 35;
LgTvApi.prototype.TV_CMD_FAST_FORWARD = 36;
LgTvApi.prototype.TV_CMD_REWIND = 37;
LgTvApi.prototype.TV_CMD_SKIP_FORWARD = 38;
LgTvApi.prototype.TV_CMD_SKIP_BACKWARD = 39;
LgTvApi.prototype.TV_CMD_RECORD = 40;
LgTvApi.prototype.TV_CMD_RECORDING_LIST = 41;
LgTvApi.prototype.TV_CMD_REPEAT = 42;
LgTvApi.prototype.TV_CMD_LIVE_TV = 43;
LgTvApi.prototype.TV_CMD_EPG = 44;
LgTvApi.prototype.TV_CMD_PROGRAM_INFORMATION = 45;
LgTvApi.prototype.TV_CMD_ASPECT_RATIO = 46;
LgTvApi.prototype.TV_CMD_EXTERNAL_INPUT = 47;
LgTvApi.prototype.TV_CMD_PIP_SECONDARY_VIDEO = 48;
LgTvApi.prototype.TV_CMD_SHOW_SUBTITLE = 49;
LgTvApi.prototype.TV_CMD_PROGRAM_LIST = 50;
LgTvApi.prototype.TV_CMD_TELE_TEXT = 51;
LgTvApi.prototype.TV_CMD_MARK = 52;
LgTvApi.prototype.TV_CMD_3D_VIDEO = 400;
LgTvApi.prototype.TV_CMD_3D_LR = 401;
LgTvApi.prototype.TV_CMD_DASH = 402;
LgTvApi.prototype.TV_CMD_PREVIOUS_CHANNEL = 403;
LgTvApi.prototype.TV_CMD_FAVORITE_CHANNEL = 404;
LgTvApi.prototype.TV_CMD_QUICK_MENU = 405;
LgTvApi.prototype.TV_CMD_TEXT_OPTION = 406;
LgTvApi.prototype.TV_CMD_AUDIO_DESCRIPTION = 407;
LgTvApi.prototype.TV_CMD_ENERGY_SAVING = 409;
LgTvApi.prototype.TV_CMD_AV_MODE = 410;
LgTvApi.prototype.TV_CMD_SIMPLINK = 411;
LgTvApi.prototype.TV_CMD_EXIT = 412;
LgTvApi.prototype.TV_CMD_RESERVATION_PROGRAM_LIST = 413;
LgTvApi.prototype.TV_CMD_PIP_CHANNEL_UP = 414;
LgTvApi.prototype.TV_CMD_PIP_CHANNEL_DOWN = 415;
LgTvApi.prototype.TV_CMD_SWITCH_VIDEO = 416;
LgTvApi.prototype.TV_CMD_APPS = 417;
LgTvApi.prototype.TV_CMD_MOUSE_MOVE = "HandleTouchMove";
LgTvApi.prototype.TV_CMD_MOUSE_CLICK = "HandleTouchClick";
LgTvApi.prototype.TV_CMD_TOUCH_WHEEL = "HandleTouchWheel";
LgTvApi.prototype.TV_CMD_CHANGE_CHANNEL = "HandleChannelChange";
LgTvApi.prototype.TV_CMD_SCROLL_UP = "up";
LgTvApi.prototype.TV_CMD_SCROLL_DOWN = "down";
LgTvApi.prototype.TV_INFO_CURRENT_CHANNEL = "cur_channel";
LgTvApi.prototype.TV_INFO_CHANNEL_LIST = "channel_list";
LgTvApi.prototype.TV_INFO_CONTEXT_UI = "context_ui";
LgTvApi.prototype.TV_INFO_VOLUME = "volume_info";
LgTvApi.prototype.TV_INFO_SCREEN = "screen_image";
LgTvApi.prototype.TV_INFO_3D = "is_3d";
LgTvApi.prototype.TV_LAUNCH_APP = "AppExecute";
LgTvApi.prototype.TV_TERMINATE_APP = "AppTerminate";
 
*/
