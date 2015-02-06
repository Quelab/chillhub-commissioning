var express = require('express');
var bodyParser = require('body-parser');
var child_process = require('child_process');
var fs = require('fs');
var hardware = require('./hardware.js')();

function isUUID(value) {
  return value && typeof(value) === 'string';
}

function isSSID(value) {
  return value && typeof(value) === 'string';
}

function isPassphrase(value) {
  return value && typeof(value) === 'string';
}

function isURL(value) {
  return value && typeof(value) === 'string';
}

function isToken(value) {
  return value && typeof(value) === 'string';
}

var commissioning = module.exports = function(options, M) {
  var app = express.Router();

  M = M || { };
  M.fs = M.fs || fs;
  M.exec = M.exec || child_process.exec;
  M.pifi = M.pifi || 'pifi';
  M.interface = M.interface || 'wlan0';
  M.tokenFile = M.tokenFile || './share/chillhub.json';

  var base_command = [
    'cd ./share &&',
    M.pifi,
    M.interface
  ];

  function pifi_state(callback) {
    var command = base_command.concat('-s').join(' ');

    M.exec(command, function(e, stdout, stderr) {
      if (e) callback(e);
      else callback(null, stdout.trim());
    });
  }

  function idle(callback) {
    var command = base_command.concat('-i').join(' ');

    M.exec(command, function(e, stdout, stderr) {
      callback(e);
    });
  }

  function access_point(callback) {
    var ssid = 'ChillHub-' + options.uuid.substr(0, 8);
    var passphrase = options.passphrase;

    var command = base_command.concat('-a', '"' + ssid + '"', '"' + passphrase + '"').join(' ');

    M.exec(command, function(e, stdout, stderr) {
      callback(e);
    });
  }

  function wireless_connect(ssid, passphrase, callback) {
    var command = base_command.concat('-w', '"' + ssid + '"', '"' + passphrase + '"').join(' ');
    
    M.exec(command, function(e, stdout, stderr) {
      callback(e);
    });
  }

  function update_led() {
    pifi_state(function(e, state) {
      if (state == 'Idle') hardware.ledOff();
      else if (state == 'WiFi_Connected') hardware.ledOn();
      else hardware.ledFlash();
    });

    setTimeout(update_led, 1000);
  }

  update_led();

  hardware.listen(function(error, event) {
    if (error) return console.error('hardware error:', error);

    if (event == 'BUTTON_PRESS_SHORT') {
      pifi_state(function(e, state) {
        if (state == 'Idle') {
          access_point(function(e) {
            console.log('Started access point');
          });
        }
        else {
          console.log('Ignoring short button press in state', state);
        }
      });
    }
    else if (event == 'BUTTON_PRESS_LONG') {
      console.log('Going to idle state');
      idle(function() { });
    }
    else {
      console.error('Unknown event:', event);
    }
  });

  app.use(bodyParser.json());

  app.get('/', function(req, res) {
    var uuid = options.uuid;

    if (!isUUID(uuid)) {
      return res.status(400).json({ kind: 'error#input-validation', property: 'uuid' });
    }
    else {
      return res.status(200).json({ uuid: uuid });
    }
  });

  app.post('/auth', function(req, res) {
    var token = req.body.token;
    var url = req.body.url;

    if (!isToken(token)) {
      return res.status(400).json({ kind: 'error#input-validation', property: 'token' });
    }
    else if (!isURL(url)) {
      return res.status(400).json({ kind: 'error#input-validation', property: 'url' });
    }
    else {
      pifi_state(function(e, state) {
        if (e) return res.status(500).json({ kind: 'error#auth', error: e });
        if (state != "AccessPoint_Hosting") return res.status(403).json({ kind: 'error#permission-denied' });

        options.firebaseUrl = url;
        options.token = token;
        M.fs.writeFileSync(M.tokenFile, JSON.stringify(options));

        return res.status(200).json({ });
      });
    }
  });

  app.get('/networks', function(req, res) {
    var command = base_command.concat('-l');

    M.exec(command.join(' '), function(e, stdout, stderr) {    
      if (e) return res.status(500).json({ kind: 'error#network-list', error: e });

      stdout = stdout.trim();
     
      var networks = (stdout ? stdout.split(',') : []).map(function(ssid) {
        return { ssid: ssid };
      });

      return res.status(200).json(networks);
    });
  });

  app.post('/networks', function(req, res) {
    var ssid = req.body.ssid, passphrase = req.body.passphrase;

    if (!isSSID(ssid)) {
      return res.status(400).json({ kind: 'error#input-validation', property: 'ssid' });
    }

    if (!isPassphrase(passphrase)) {
      return res.status(400).json({ kind: 'error#input-validation', property: 'passphrase' });
    }

    res.status(200).json({ ssid: ssid });
    wireless_connect(ssid, passphrase, function() { });
  });

  app.delete('/networks', function(req, res) {
    res.status(204).end();
    access_point(function() { });
  });

  return app;  
};
