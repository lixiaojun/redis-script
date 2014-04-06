redis-script
============

```JS
var redis = require('redis');
var RedisScript = require('redis-script').RedisScript;

var client = redis.createClient();
var rediss = new RedisScript(client);

rediss.loadFromScript('test', 'return "test"');
rediss.run('test', [], [], function (err, res) {
  //do some thing.
});

...

rediss.loadFromFile('test', './scripts/s.lua');

...


rediss.loadFromDir('./scripts');

...

var loads = [
  {
    "name": "test",
    "script": "return 'test'"
  },
  
  {
    "name": "test2",
    "path": "./scripts/test2.lua"
  }
];

redis.loadFromJson(loads);

```
