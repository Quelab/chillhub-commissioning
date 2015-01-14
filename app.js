var express = require('express');
var bodyParser = require('body-parser');
var child_process = require('child_process');
var fs = require('fs');

var commissioning = module.exports = function(options) {
  var app = express.Router();

  options = options || { };
  options.fs = options.fs || fs;
  options.exec = options.exec || child_process.exec;
  options.pifi = options.pifi || '/share/pifi';
  options.interface = options.interface || 'wlan0';
  options.tokenFile = options.tokenFile || '/share/token.json';

  var base_command = [
    options.pifi,
    options.interface
  ];

  app.use(bodyParser.json());

  app.get('/', function(req, res) {
    var uuid = options.uuid;

    if (typeof(uuid) !== 'string') {
      return res.status(400).json({ kind: 'error#input-validation', property: 'uuid' });
    }
    else {
      return res.status(200).json({ uuid: uuid });
    }
  });

  app.post('/token', function(req, res) {
    var token = req.body.token;

    if (typeof(token) !== 'string') {
      return res.status(400).json({ kind: 'error#input-validation', property: 'token' });
    }
    else {
      options.fs.writeFileSync(options.tokenFile, JSON.stringify({ token: token }));
      return res.status(200).json({ });
    }
  });

  app.get('/networks', function(req, res) {
    var command = base_command.concat('-l');

    options.exec(command.join(' '), function(e, stdout, stderr) {    
      if (e) return res.status(500).json({ kind: 'error#network-list', error: e });
      
      var networks = stdout.split(',').map(function(ssid) {
        return { ssid: ssid };
      });

      return res.status(200).json(networks);
    });
  });

  app.post('/networks', function(req, res) {
    var ssid = req.body.ssid, passphrase = req.body.passphrase;

    if (typeof(ssid) !== 'string') {
      return res.status(400).json({ kind: 'error#input-validation', property: 'ssid' });
    }

    if (typeof(passphrase) !== 'string') {
      return res.status(400).json({ kind: 'error#input-validation', property: 'passphrase' });
    }

    var command = base_command.concat('-w', '"' + ssid + '"', '"' + passphrase + '"');

    options.exec(command.join(' '), function(e, stdout, stderr) {    
      if (e) res.status(500).json({ kind: 'error#network-connect', error: e });
      else res.status(200).json({ ssid: ssid });
    });
  });

  return app;  
};
