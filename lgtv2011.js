'use strict';
var fs 				= require('fs'); // for storing client key
var utils 			= require(__dirname + '/lib/utils');
var adapter 		= utils.adapter('lgtv2011');
var LGTV            = require(__dirname + '/lib/api.js');
var pollTimerChannel		= null;




/*function pollChannel() {
	adapter.log.debug('Polling channel');
	sendCommand(TV_CMD_POWER, [], function (err, val) 
	{
		if (!err) 
			adapter.setState('turnOff', state.val, true);
	});

	sendCommand('ssap://tv/getCurrentChannel', null, function (err, channel) 
	{
		var JSONChannel, ch;
		JSONChannel = JSON.stringify(channel);
		adapter.log.debug('DEBUGGING CHANNEL POLLING PROBLEM: ' + JSONChannel);
		if (JSONChannel) ch = JSONChannel.match(/"channelNumber":"(\d+)"/m);
		if (!err && ch) 
		{
			adapter.setState('channel', ch[1], true);
		} 
		else 
		{
			adapter.setState('channel', '', true);
		}
	});
}*/

function RequestPairingKey(ip, port) 
{
	adapter.log.info('Requesting Pairing Key on TV: ' + adapter.config.ip);
	var lgtvobj = new LGTV(adapter.config.ip, adapter.config.port);
	lgtvobj.displayPairingKey(function (err) 
	{
		if (err) adapter.log.error('ERROR: ' + err);
    })
}

function sendCommand(cmd, options, cb) 
{
	var lgtvobj = new LGTV(adapter.config.ip, adapter.config.port, adapter.config.pairingkey);
	lgtvobj.authenticate(function (err, sessionKey) 
	{
        if (err) 
            adapter.log.error('ERROR in  authenticating while sending command "' + cmd + '" to LG TV ' + adapter.config.ip + ' Error message: ' + err);
		else 
		{
            lgtvobj.processCommand(cmd, [options], function (err, data) 
			{
                if (err) 
					adapter.log.error('ERROR in  sending command "' + cmd + '" to LG TV ' + adapter.config.ip + ' Error message: ' + err);
            });
        }
    });
}

adapter.on('stateChange', function (id, state)
{
    if (id && state && !state.ack)
	{
		id = id.substring(adapter.namespace.length + 1);
		switch (id)
		{
			case 'turnOff':
				adapter.log.debug('Sending turn Off message "' + state.val + '" to LG TV: ' + adapter.config.ip);
				sendCommand(TV_CMD_POWER, [], function (err, val) 
				{
					if (!err) 
						adapter.setState('turnOff', state.val, true);
				});
			break;
			
			case 'volumeUp':
				adapter.log.debug('Sending volumeUp message "' + state.val + '" to LG TV: ' + adapter.config.ip);
				sendCommand(TV_CMD_VOLUME_UP, [], function (err, val) 
				{
					if (!err) 
						adapter.setState('volumeUp', !!state.val, true);
				});
			break;
			
			case 'volumeDown':
				adapter.log.debug('Sending volumeDown message "' + state.val + '" to LG TV: ' + adapter.config.ip);
				sendCommand(TV_CMD_VOLUME_DOWN, [], function (err, val) 
				{
					if (!err) 
						adapter.setState('volumeDown', !!state.val, true);
				});
			break;
			
			case 'mute':
				adapter.log.debug('Sending mute message "' + state.val + '" to LG TV: ' + adapter.config.ip);
				sendCommand(TV_CMD_MUTE_TOGGLE, [], function (err, val) 
				{
					if (!err) 
						adapter.setState('mute', !!state.val, true);
				});
			break;
			
			case 'channelUp':
				adapter.log.debug('Sending channel Up message "' + state.val + '" to LG TV: ' + adapter.config.ip);
				sendCommand(TV_CMD_CHANNEL_UP, [], function (err, val) 
				{
					if (!err) 
						adapter.setState('channelUp', !!state.val, true);
				});
			break;			

			case 'channelDown':
				adapter.log.debug('Sending channel Down message "' + state.val + '" to LG TV: ' + adapter.config.ip);
				sendCommand(TV_CMD_CHANNEL_DOWN, [], function (err, val) 
				{
					if (!err) 
						adapter.setState('channelDown', !!state.val, true);
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
	adapter.log.info('Ready. Configured LG TV IP: ' + adapter.config.ip);
    adapter.subscribeStates('*');
	if (parseInt(adapter.config.interval, 10)) 
	{
//		pollTimerChannel = setInterval(pollChannel, parseInt(adapter.config.interval, 10));
	}
}



var TV_CMD_POWER = 1;
var TV_CMD_NUMBER_0 = 2;
var TV_CMD_NUMBER_1 = 3;
var TV_CMD_NUMBER_2 = 4;
var TV_CMD_NUMBER_3 = 5;
var TV_CMD_NUMBER_4 = 6;
var TV_CMD_NUMBER_5 = 7;
var TV_CMD_NUMBER_6 = 8;
var TV_CMD_NUMBER_7 = 9;
var TV_CMD_NUMBER_8 = 10;
var TV_CMD_NUMBER_9 = 11;
var TV_CMD_UP = 12;
var TV_CMD_DOWN = 13;
var TV_CMD_LEFT = 14;
var TV_CMD_RIGHT = 15;
var TV_CMD_OK = 20;
var TV_CMD_HOME_MENU = 21;
var TV_CMD_BACK = 23;
var TV_CMD_VOLUME_UP = 24;
var TV_CMD_VOLUME_DOWN = 25;
var TV_CMD_MUTE_TOGGLE = 26;
var TV_CMD_CHANNEL_UP = 27;
var TV_CMD_CHANNEL_DOWN = 28;
var TV_CMD_BLUE = 29;
var TV_CMD_GREEN = 30;
var TV_CMD_RED = 31;
var TV_CMD_YELLOW = 32;
var TV_CMD_PLAY = 33;
var TV_CMD_PAUSE = 34;
var TV_CMD_STOP = 35;
var TV_CMD_FAST_FORWARD = 36;
var TV_CMD_REWIND = 37;
var TV_CMD_SKIP_FORWARD = 38;
var TV_CMD_SKIP_BACKWARD = 39;
var TV_CMD_RECORD = 40;
var TV_CMD_RECORDING_LIST = 41;
var TV_CMD_REPEAT = 42;
var TV_CMD_LIVE_TV = 43;
var TV_CMD_EPG = 44;
var TV_CMD_PROGRAM_INFORMATION = 45;
var TV_CMD_ASPECT_RATIO = 46;
var TV_CMD_EXTERNAL_INPUT = 47;
var TV_CMD_PIP_SECONDARY_VIDEO = 48;
var TV_CMD_SHOW_SUBTITLE = 49;
var TV_CMD_PROGRAM_LIST = 50;
var TV_CMD_TELE_TEXT = 51;
var TV_CMD_MARK = 52;
var TV_CMD_3D_VIDEO = 400;
var TV_CMD_3D_LR = 401;
var TV_CMD_DASH = 402;
var TV_CMD_PREVIOUS_CHANNEL = 403;
var TV_CMD_FAVORITE_CHANNEL = 404;
var TV_CMD_QUICK_MENU = 405;
var TV_CMD_TEXT_OPTION = 406;
var TV_CMD_AUDIO_DESCRIPTION = 407;
var TV_CMD_ENERGY_SAVING = 409;
var TV_CMD_AV_MODE = 410;
var TV_CMD_SIMPLINK = 411;
var TV_CMD_EXIT = 412;
var TV_CMD_RESERVATION_PROGRAM_LIST = 413;
var TV_CMD_PIP_CHANNEL_UP = 414;
var TV_CMD_PIP_CHANNEL_DOWN = 415;
var TV_CMD_SWITCH_VIDEO = 416;
var TV_CMD_APPS = 417;
var TV_CMD_MOUSE_MOVE = 'HandleTouchMove';
var TV_CMD_MOUSE_CLICK = 'HandleTouchClick';
var TV_CMD_TOUCH_WHEEL = 'HandleTouchWheel';
var TV_CMD_CHANGE_CHANNEL = 'HandleChannelChange';
var TV_CMD_SCROLL_UP = 'up';
var TV_CMD_SCROLL_DOWN = 'down';
var TV_INFO_CURRENT_CHANNEL = 'cur_channel';
var TV_INFO_CHANNEL_LIST = 'channel_list';
var TV_INFO_CONTEXT_UI = 'context_ui';
var TV_INFO_VOLUME = 'volume_info';
var TV_INFO_SCREEN = 'screen_image';
var TV_INFO_3D = 'is_3d';
var TV_LAUNCH_APP = 'AppExecute';