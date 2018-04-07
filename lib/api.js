'use strict';
const request = require('request');
const fs = require('fs');
const xml2js = require('xml2js');
const async = require('async');


const xmlBuilder = new xml2js.Builder();
const xmlParser = new xml2js.Parser();


module.exports = LgTvApi;

function LgTvApi(_host, _port, _pairingKey) {
    this.host = _host;
    this.port = _port;
    this.pairingKey = _pairingKey;
    this.session = null;
    this.debugMode = false;
}
LgTvApi.prototype.setDebugMode = function (_debugMode) {
    this.debugMode = _debugMode;
};

LgTvApi.prototype.displayPairingKey = function (functionCallback) {
    this.sendXMLRequest('/roap/api/auth', {auth: {type: 'AuthKeyReq'}}, (function (err, response, data) {
        if (err || response.statusCode != 200) {
            functionCallback(err != null ? err : new Error('Response code:' + response.statusCode));
        } else {
            functionCallback(null);
        }
    }).bind(this));
};

LgTvApi.prototype.authenticate = function (functionCallback) {
    if (this.pairingKey === null) {
        this.displayPairingKey(functionCallback);
    } else {
        async.waterfall([
            (function (callback) {
                this.sendXMLRequest('/roap/api/auth', {auth: {type: 'AuthReq', value: this.pairingKey}}, callback)
            }).bind(this),
            (function (err, response, data, callback) {
                if (err || response.statusCode != 200) {
                    callback(err  ? err : new Error('Response code:' + response.statusCode), data);
                } else {
                    xmlParser.parseString(data, callback);
                }
            }).bind(this)
        ], (function (err, data) {
            if (err) {
                functionCallback(err, null)
            } else {
                this.session = data.envelope.session[0];
                functionCallback(err, this.session);
            }
        }).bind(this));
    }
};

LgTvApi.prototype.processCommand = function (commandName, parameters, functionCallback) {
    if (this.session === null) {
        functionCallback(new Error("No session id"));
    }

    if (!isNaN(parseInt(commandName)) && parameters.length == 0) {
        parameters.value = commandName;
        commandName = 'HandleKeyInput';
    } else if (isNaN(parseInt(parameters)) && isNaN(parseInt(parameters))) {
        parameters.value = parameters;
    } else {

    }

    parameters.name = commandName;

    async.waterfall([
        (function (callback) {
            this.sendXMLRequest('/roap/api/command', {command: parameters}, callback);
        }).bind(this),
        (function (err, response, data, callback) {
            if (err || response.statusCode != 200) {
                callback(err  ? err : new Error('Response code:' + response.statusCode), data);
            } else {
                xmlParser.parseString(data, callback);
            }
        }).bind(this)

    ], (function (err, data) {
        if (err) {
            functionCallback(err, null)
        } else {
            functionCallback(err, data);
        }
    }).bind(this));

};

LgTvApi.prototype.queryData = function (targetId, functionCallback) {
    if (this.session === null) {
        functionCallback(new Error("No session id"));
    }
    async.waterfall([
        (function (callback) {
            this.sendRequest('/roap/api/data?target=' + targetId, callback);
        }).bind(this),
        (function (err, response, data, callback) {
            if (err || response.statusCode != 200) {
                callback(err != null ? err : new Error('Response code:' + response.statusCode));
            } else {
                xmlParser.parseString(data, callback);
            }
        }).bind(this)
    ], function (err, data) {
        if (err) {
            functionCallback(err, null)
        } else {
            functionCallback(err, data.envelope.data);
        }
    });

};

LgTvApi.prototype.takeScreenShot = function (fileName, functionCallback) {
    let path = '/roap/api/data?target=' + this.TV_INFO_SCREEN;
    if (this.debugMode) {
        console.info('REQ path:' + path);
    }
    let uri = 'http://' + this.host + ':' + this.port + path;
    let options = {
        headers: {
            'Content-Type': 'application/atom+xml',
            'Connection': 'Keep-Alive'
        }
    };
    request.get(uri, options).pipe(fs.createWriteStream(fileName)).on('close', functionCallback);
};

LgTvApi.prototype.sendXMLRequest = function (path, params, callback) {
    let reqBody = xmlBuilder.buildObject(params);
    if (this.debugMode) {
        console.info('REQ:' + reqBody);
    }
    let uri = 'http://' + this.host + ':' + this.port + path;
    let options = {
        headers: {
            'Content-Type': 'application/atom+xml',
            'Connection': 'Keep-Alive'
        },
        body: reqBody
    };
    request.post(uri, options, (function (err, response, data) {
        if (this.debugMode) {
            console.info('RESP:' + data);
        }
        callback(null, err, response, data);
    }).bind(this));
};

LgTvApi.prototype.sendRequest = function (path, callback) {
    if (this.debugMode) {
        console.info('REQ path:' + path);
    }
    let uri = 'http://' + this.host + ':' + this.port + path;
    let options = {
        headers: {
            'Content-Type': 'application/atom+xml',
            'Connection': 'Keep-Alive'
        }
    };
    request.get(uri, options, (function (err, response, data) {
        if (this.debugMode) {
            console.info('RESP:' + data);
        }
        callback(null, err, response, data);
    }).bind(this));
};




