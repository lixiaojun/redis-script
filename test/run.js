var RedisScript = require('../').RedisScript;
var test = require('tape');
var redis = require('redis');
var crypto = require('crypto');
var fs = require('fs');

var redis = require("redis");
var client = redis.createClient();
var rediss = new RedisScript(client);

test('eval script', function (t) {
  t.plan(4);
  var name = 'hello';
  var script = 'return "hello"';

  rediss.loadFromScript(name, script);
  rediss.run(name, [], [], function (err, res) {
    t.notOk(err, 'run is ok.');
    t.deepEqual(res, 'hello', 'The result is ok.');
  });

  rediss.loadFromFile('a', './test/scripts/a.lua');
  rediss.run('a', [], [], function (err, res) {
    t.notOk(err, 'run is ok.');
    t.deepEqual(res, 'a', 'The result is ok.');
  });

  t.on('end', function () {
    client.quit();
  });

});