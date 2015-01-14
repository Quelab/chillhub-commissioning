var should = require('should');
var request = require('supertest');
var express = require('express');
var commissioning = require('./app.js');

describe('commissioning', function() {
  var app, options;

  beforeEach(function() {
    options = {
      uuid: '1af9942c-f1f5-4f50-ae25-92833b654ead'
    };

    app = express();
    app.use(commissioning(options));
  })

  describe('GET /', function() {
    it('should validate the uuid', function(done) {
      options.uuid = null;

      request(app)
        .get('/')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/)
        .expect(400, {
          kind: 'error#input-validation',
          property: 'uuid'
        }, done);
    })

    it('should return the uuid', function(done) {
      request(app)
        .get('/')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200, {
          uuid: '1af9942c-f1f5-4f50-ae25-92833b654ead'
        }, done);
    })
  })

  describe('POST /token', function() {
    it('should validate the token', function(done) {
      request(app)
        .post('/token')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({ })
        .expect('Content-Type', /json/)
        .expect(400, {
          kind: 'error#input-validation',
          property: 'token'
        }, done);
    })

    it('should save the token to the file', function(done) {
      options.fs = {
        writeFileSync: function(filename, json) {
          should(filename).eql('/share/token.json');
          should(JSON.parse(json)).eql({ token: 'abc123' });
          done();
        }
      };

      request(app)
        .post('/token')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({ token: 'abc123' })
        .end(function() { });
    })

    it('should return success', function(done) {
      options.fs = {
        writeFileSync: function(filename, json) { }
      };

      request(app)
        .post('/token')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({ token: 'abc123' })
        .expect('Content-Type', /json/)
        .expect(200, done);
    })
  })

  describe('GET /networks', function() {
    it('should run the network list command', function(done) {
      options.exec = function(command, callback) {
        should(command).eql('/share/pifi wlan0 -l');
        done();
      };

      request(app)
        .get('/networks')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .end(function() { });
    })

    it('should handle errors', function(done) {
      options.exec = function(command, callback) {
        callback('failure');
      };

      request(app)
        .get('/networks')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/)
        .expect(500, {
          kind: 'error#network-list',
          error: 'failure'
        }, done);
    })

    it('should return the network list', function(done) {
      options.exec = function(command, callback) {
        callback(null, 'Network 1,Network2,Network-3\n');
      };

      request(app)
        .get('/networks')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200, [
          { ssid: 'Network 1' },
          { ssid: 'Network2' },
          { ssid: 'Network-3' }
        ], done);
    })
    
    it('should handle empty network list', function(done) {
      options.exec = function(command, callback) {
        callback(null, '\n');
      };

      request(app)
        .get('/networks')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200, [], done);
    })
  })

  describe('POST /networks', function() {
    it('should validate the ssid', function(done) {
      request(app)
        .post('/networks')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({
          passphrase: 'some password'
        })
        .expect('Content-Type', /json/)
        .expect(400, {
          kind: 'error#input-validation',
          property: 'ssid'
        }, done);
    })

    it('should validate the passphrase', function(done) {
      request(app)
        .post('/networks')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({
          ssid: 'Some Network'
        })
        .expect('Content-Type', /json/)
        .expect(400, {
          kind: 'error#input-validation',
          property: 'passphrase'
        }, done);
    })

    it('should run the network connect command', function(done) {
      options.exec = function(command, callback) {
        should(command).eql('/share/pifi wlan0 -w "Some Network" "some password"');
        done();
      };

      request(app)
        .post('/networks')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({
          ssid: 'Some Network',
          passphrase: 'some password'
        })
        .end(function() { });
    })

    it('should handle errors', function(done) {
      options.exec = function(command, callback) {
        callback('failure');
      };

      request(app)
        .post('/networks')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({
          ssid: 'Some Network',
          passphrase: 'some password'
        })
        .expect('Content-Type', /json/)
        .expect(500, {
          kind: 'error#network-connect',
          error: 'failure'
        }, done);
    })

    it('should return with success', function(done) {
      options.exec = function(command, callback) {
        callback(null, 'Network 1,Network2,Network-3');
      };

      request(app)
        .post('/networks')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({
          ssid: 'Some Network',
          passphrase: 'some password'
        })
        .expect('Content-Type', /json/)
        .expect(200, done);
    })
  })
})
