var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

function _sha1(content) {
  return crypto.createHash("sha1").update(content).digest("hex");
}

function _evalsha(redis, sha, keys, args, cb) {
  var redisArgs = [keys.length].concat(keys, args);
  redisArgs.unshift(sha);

  redis.send_command('EVALSHA', redisArgs, cb);
}

function RedisScript(redis) {

  this.scripts = {};
  this.redis = redis;
}

RedisScript.prototype._loadFromObject = function _loadFromObject(cmd) {
  var self = this;
  var name = cmd.name;
  // TODO: handle param error.


  if (self.scripts[name]) {
    console.warn(name + ' be overwritten.');
  }
  self.scripts[name] = cmd;

};

RedisScript.prototype._setScriptForObj = function _setScriptForObj(cmd, data) {
  cmd.script = data;
  cmd.sha = _sha1(data);
  cmd.status = false;
};

RedisScript.prototype.loadFromScript = function loadFromScript(cmdName, script) {
  var self = this;
  var cmd = {};

  cmd.name = cmdName;
  self._setScriptForObj(cmd, script);
  self._loadFromObject(cmd);
};

RedisScript.prototype.loadFromFile = function loadFormFile(cmdName, filepath) {
  var self = this;
  var cmd = {};
  cmd.name = cmdName;
  cmd.path = filepath;
  cmd.script = '';
  cmd.sha = '';
  cmd.status = false;

  self._loadFromObject(cmd);

};

/*
[
  {
    "name": "hello",
    "script": "return 'hello'"
  },

  {
    "name": "gettask",
    "path": "./lib/gettask.lua"
  }
]
 */
RedisScript.prototype.loadFromJson = function loadFromJson(json) {
  //load scripts from a json.
  if (!Array.isArray(json)) {
    throw new TypeError();
  }

  var self = this;

  json.forEach(function (item) {
    if (!item.name) {
      console.error('ignore a command that isn\'t name.');
      return;
    }

    var name = item.name;
    var script = item.script || '';
    var path = item.path || '';

    if (script) {
      self.loadFromScript(name, script);
      return;
    }

    if (path) {
      self.loadFromFile(name, path);
      return;
    }

  });

};

/**
 * filename (don't contain a suffix) as a commmand name.
 */
RedisScript.prototype.loadFromDir = function loadFromDir(dir) {
  // load scripts from a directory.
  var self = this;
  var names;
  var cnt = 0;

  try {
    names = fs.readdirSync(dir);
  } catch (e) {
    console.error(e);
    return;
  }

  names.forEach(function (item) {

    if (/\.lua$/i.test(item)) {
      var file = path.resolve(dir, item);
      var name = item.replace('.lua', '');

      self.loadFromFile(name, file);
      cnt += 1;
    }

  });

  if (!cnt) {
    console.warn('no lua scripts in `' + dir + '`');
  }
};

//eval alias
RedisScript.prototype.run = function run(name, keys, args, cb) {
  var self = this;
  self._runCommand(name, keys, args, cb);
};

//evalsha alias
RedisScript.prototype.runsha = function runsha(sha, keys, args, cb) {
  var self = this;
  _evalsha(self.redis, sha, keys, args, cb);
};

RedisScript.prototype._runCommand = function _runCommand(name, keys, args, cb) {
  var self = this;
  var cmd = self.scripts[name];

  if (!cmd) {
    cb(new Error('Invaild command: ' + name));
    return;
  }

  if (cmd.sha) {
    // evalsha if konwn.
    _evalsha(self.redis, cmd.sha, keys, args, function (err, res) {
      if (err) {
        if (/^NOSCRIPT/i.test(err.message)) {
          //load script and eval.
          self._prepareCommand(cmd, function (err, cmd) {
            if (err) {
              cb(err);
              return;
            }
            _evalsha(self.redis, cmd.sha, keys, args, function (err, res) {
              cb(err, res);
            });

          });
          return;
        }

        cb(err);
      }
      cb(null, res);
    });

  } else {
    //evalsha if unknown, first to load script into redis.
    self._prepareCommand(cmd, function (err, cmd) {
      if (err) {
        cb(err);
        return;
      }
      _evalsha(self.redis, cmd.sha, keys, args, function (err, res) {
        cb(err, res);
      });

    });
  }
};

// self._prepareCommand(cmd, function (err, cmd) { ... })
RedisScript.prototype._prepareCommand = function _prepareCommand(cmd, cb) {
  var self = this;

  if (cmd.sha) {
    self._redisScriptLoad(cmd, function (err, cmd) {
      cb(err, cmd);
    });
    return;
  }

  if (!cmd.path) {
    cb(new Error('Empty script: ' + cmd.name));
    return;
  }

  fs.readFile(cmd.path, {"encoding": "utf8", "flag": "r"}, function (err, data) {
    if (err) {
      cb(err);
      return;
    }

    self._setScriptForObj(cmd, data);
    self._redisScriptLoad(cmd, function (err, cmd) {
      cb(err, cmd);
    });
  });

};

// self._redisScriptLoad(cmd, function (err, res) { ... })
// res is cmd if script has been loaded else null.
RedisScript.prototype._redisScriptLoad = function _redisScriptLoad(cmd, cb) {
  var self = this;
  var client = self.redis;
  var scriptsha = cmd.sha;
  var script = cmd.script;

  client.script('EXISTS', scriptsha, function (err, res) {
    if (err) {
      console.error(err);
      cb(err);
      return;
    }

    // script already exists in the redis.
    if (res[0]) {
      cmd.status = true;
      cb(null, cmd);
      return;
    }

    // load script into redis.
    client.script('LOAD', script, function (err) {
      cmd.status = !err;
      cb(err, cmd);
    });
  });
};

exports.RedisScript = RedisScript;