'use strict';
var fs 				= require('fs'); // for storing client key
var utils 			= require(__dirname + '/lib/utils');
var adapter 		= utils.adapter('lgtv2011');
var TvApi			= require(__dirname + '/lib/api');
var pollTimerChannel = null;
var	xml2js         = require('xml2js').parseString,    
	http           = require('http');


	
var device_is2012 = false;
	
function postRequest (ip, path, post_data, callback) {
    var options = {
        host:   ip,
        port:   8080,
        path:   path,
		method: 'POST',
		headers: {
          'Content-Type': 'application/atom+xml',
          'Content-Length': post_data.length
      }
    };
	// Set up the request
	var post_req = http.request(options, function(res) {
		var xmldata = '';
		res.setEncoding('utf8'),
		res.on('error', function (e) {
			adapter.log.error("ERROR: " + e);
			if (callback) {
                callback(ip, null);
            }
		});
		res.on('data', function(chunk){
			xmldata += chunk;
		})
		res.on('end', function () {
            adapter.log.debug('Response: ' + xmldata);
			if (callback) 
				callback (ip, xmldata);
		});
	});

    post_req.on("error", function (e) {
        adapter.log.error('Error by request - ' + e);
    });
}

function RequestPairingKey(ip, port) 
{
	adapter.log.info('Requesting Pairing Key on TV: ' + adapter.config.ip);
	postRequest(adapter.config.ip, device_is2012 ? "/roap/api/auth" : "/hdcp/api/auth", "<?xml version=\"1.0\" encoding=\"utf-8\"?><auth><type>AuthKeyReq</type></auth>");
}

function getSessionId (ip, paringKey, callb) {
	postRequest (ip,
        device_is2012 ? "/roap/api/auth" : "/hdcp/api/auth",
		"<?xml version=\"1.0\" encoding=\"utf-8\"?><auth><type>AuthReq</type><value>"+paringKey+"</value></auth>",
		function (ip_, result) {
			if (result) {
				xml2js (result, function (err, jsObject) {
					if (!err && jsObject.envelope && jsObject.envelope.session) {
						if (callb) 
							callb (ip_, jsObject.envelope.session[0]);
					}
					else {
						if (callb) 
							callb (ip_, null);	
					}
				});
			}
		}
	);
}

function handleCommand (device, session, cmd, cb) {
	//echo "<?xml version=\"1.0\" encoding=\"utf-8\"?><command><session>".$session."</session><type>HandleKeyInput</type><value>".$cmd."</value></command>";
	postRequest (device,
        device_is2012 ? "/roap/api/command" : "/hdcp/api/dtv_wifirc",
		"<?xml version=\"1.0\" encoding=\"utf-8\"?><command><session>"+session+"</session>" +
            (device_is2012 ? "<name>HandleKeyInput</name>" : "<type>HandleKeyInput</type>")+"<value>"+cmd+"</value></command>",
		function (device_, result) {
			if (cb) {
				cb (device_, result);
			}
		}
	);
}

var commands = {
// Menus                           2011  2012
	"menu_status_bar":            ["35",  -1],
	"menu_quick_menu":            ["69",  -1],
	"menu_home_menu":             ["67",  "21"],
	"menu_premium_menu":          ["89",  -1],
	"menu_installation_menu":     ["207", -1],
	"menu_IN_START":              ["251", -1],
	"menu_EZ_ADJUST":             ["255", -1],
	"menu_power_only":            ["254", -1],
	"menu_my_apps":               [-1,   "417"],
	"menu_net_cast":              [-1,   "408"],
// Power controls                 
	"power_off" :                 ["8",   "1"],
	"power_sleep_timer":          ["14",  -1],
// Navigation                     
	"nav_left" :                  ["7",   "14"],
	"nav_right" :                 ["6",   "15"],
	"nav_up" :                    ["64",  "12"],
	"nav_down" :                  ["65",  "13"],
	"nav_select" :                ["68",  "20"],
	"nav_back" :                  ["40",  "23"],
	"nav_exit" :                  ["91",  "412"],
	"nav_blue" :                  ["97",  "31"],
	"nav_green" :                 ["113", "30"],
	"nav_red" :                   ["114", "32"],
	"nav_yellow" :                ["99",  "29"],
// keypad                         
	"keypad_0" :                  ["16",  "2"],
	"keypad_1" :                  ["17",  "3"],
	"keypad_2" :                  ["18",  "4"],
	"keypad_3" :                  ["19",  "5"],
	"keypad_4" :                  ["20",  "6"],
	"keypad_5" :                  ["21",  "7"],
	"keypad_6" :                  ["22",  "8"],
	"keypad_7" :                  ["23",  "9"],
	"keypad_8" :                  ["24",  "10"],
	"keypad_9" :                  ["25",  "11"],
	// Undescore                          
	"keypad__" :                  ["76",  -1],
	//Playback controls                   
	"playback_play" :             ["176", "33"],
	"playback_pause" :            ["186", "34"],
	"playback_fast_forward" :     ["142", "36"],
	"playback_rewind" :           ["143", "37"],
	"playback_stop" :             ["177", "35"],
	"playback_record" :           ["189", "40"],
// Input controls                         
	"input_tv_radio" :            ["15",  -1],
	"input_simplink" :            ["126", "411"],
	"input_input" :               ["11",  "47"],
	"input_component_rgb_hdmi" :  ["152", -1],
	"input_component" :           ["191", -1],
	"input_rgb" :                 ["213", -1],
	"input_hdmi" :                ["198", -1],
	"input_hdmi1" :               ["206", -1],
	"input_hdmi2" :               ["204", -1],
	"input_hdmi3" :               ["233", -1],
	"input_hdmi4" :               ["218", -1],
	"input_av1" :                 ["90",  -1],
	"input_av2" :                 ["208", -1],
	"input_av3" :                 ["209", -1],
	"input_usb" :                 ["124", -1],
	"input_slideshow_usb1" :      ["238", -1],
	"input_slideshow_usb2" :      ["168", -1],
// TV Controls                            
	"tv_channel_up" :             ["0",   "27"],
	"tv_channel_down" :           ["1",   "28"],
	"tv_channel_back" :           ["26",  "403"],
	"tv_favorites" :              ["30",  -1],
	"tv_teletext" :               ["32",  "51"],
	"tv_t_opt" :                  ["33",  -1],
	"tv_channel_list" :           ["83",  "50"],
	"tv_greyed_out_add_button" :  ["85",  -1],
	"tv_guide" :                  ["169", "44"],
	"tv_info" :                   ["170", "45"],
	"tv_live_tv" :                ["158", "43"],
  // Picture controls             
	"picture_av_mode" :           ["48",  "410"],
	"picture_mode" :              ["77",  -1],
	"picture_ratio" :             ["121", -1],
	"picture_ratio_4_3" :         ["118", -1],
	"picture_ratio_16_9" :        ["119", -1],
	"picture_energy_saving" :     ["149", "409"],
	"picture_cinema_zoom" :       ["175", -1],
	"picture_3D" :                ["220", "400"],
	"picture_factory_check" :     ["252", -1],
	// Audio controls                   
	"audio_volume_up" :           ["2",   "24"],
	"audio_volume_down" :         ["3",   "25"],
	"audio_mute" :                ["9",   "26"],
	"audio_language" :            ["10",  -1],
	"audio_sound_mode" :          ["82",  -1],
	"audio_factory_sound_check" : ["253", -1],
	"audio_subtitle_language" :   ["57",  -1],
	"audio_audio_description" :   ["145", "407"]
}; 

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
	adapter.log.info('Ready. Configured LG TV IP: ' + adapter.config.ip);
    adapter.subscribeStates('*');
	if (parseInt(adapter.config.interval, 10)) 
	{
//		pollTimerChannel = setInterval(pollChannel, parseInt(adapter.config.interval, 10));
	}
}