var RedisScript = require('../').RedisScript;
var test = require('tape');
var redis = require('redis');
var crypto = require('crypto');
var fs = require('fs');

var redis = require("redis");
var client = redis.createClient();
var rediss = new RedisScript(client);

function _sha1(content) {
  return crypto.createHash("sha1").update(content).digest("hex");
}

test('test load from script', function (t) {
  var name = 'test';
  var script = 'return "hello"';

  rediss.loadFromScript(name, script);
  t.ok(rediss.scripts.test, 'loadFromScript is ok.');
  t.ok(rediss.scripts.test.sha, 'script sha is ok.');
  t.deepEqual(rediss.scripts.test.sha, _sha1('return "hello"'), 'script sha is ok.');
  t.deepEqual(rediss.scripts.test.script, script, 'script is ok.');
  t.end();
});

test('test load from file', function (t) {
  var alua = './scripts/a.lua';

  rediss.loadFromFile('a1', alua);
  t.ok(rediss.scripts.a1, 'loadFromFile is ok');
  t.deepEqual(rediss.scripts.a1.path, alua, 'script path is ok.');
  t.end();
});

test('test load from dir', function (t) {
  var dir = './test/scripts';

  rediss.loadFromDir(dir);
  t.ok(rediss.scripts.a, 'load from dir');
  t.ok(rediss.scripts.b, 'load from dir');
  t.ok(fs.existsSync(rediss.scripts.a.path), 'script path is ok.');
  t.ok(fs.existsSync(rediss.scripts.b.path), 'script path is ok.');
  t.end();
});

test('test load from json', function (t) {
  var loads = [
    {
      "name": "json1",
      "script": "return 'hello'"
    },

    {
      "name": "json2",
      "path": './test/scripts/a.lua'
    }
  ];

  rediss.loadFromJson(loads);

  t.ok(rediss.scripts.json1, 'loadFromJson is ok.');
  t.ok(rediss.scripts.json1.sha, 'script sha is ok.');
  t.deepEqual(rediss.scripts.json1.sha, _sha1(loads[0].script), 'script sha is ok.');
  t.deepEqual(rediss.scripts.json1.script, loads[0].script, 'script is ok.');

  t.ok(rediss.scripts.json2, 'loadFromJson is ok.');
  t.ok(fs.existsSync(rediss.scripts.json2.path), 'script path is ok.');
  t.end();

  client.quit();

});
