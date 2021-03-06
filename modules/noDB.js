var fs = require('fs');
var changed = false;
var timer;

var saveDB = function(db) {
  return setTimeout(function() {
    if (changed) fs.writeFile('noDB.txt', JSON.stringify(db, null, 1), function(err) {
    });
    changed = false;
    timer = saveDB(db);
  }, 1000);
};

var isNumeric = function(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
};

module.exports = {

  // Emulation of NodeM & GT.M using a JSON object as data storage
  //  Designed for use with platforms that don't support a Mumps database,
  //   eg Raspberry Pi and other ARM devices
  //  Note: when used with EWD.js / ewdgateway2, *only* 1 child process should be used!

  Gtm: function() {

    var db = {};

    this.version = function() {
      var build = '2';
      var date = '12 November 2013';
      var about = this.about();
      return about + '; noDB Version: ' + build + ' (' + date + ')';
    };


    this.about = function() {
      return 'Node.js Adaptor for noDB.js (M/Gateway Developments Ltd)';
    };

    this.open = function() {
      if (fs.existsSync('noDB.txt')) {
        var data = fs.readFileSync('noDB.txt', 'utf-8');
        try {
          db = JSON.parse(data);
          console.log('database loaded: ' + JSON.stringify(db));
        }
        catch(err) {
        }
      }
      timer = saveDB(db);
      return true;
    };

    this.set = function(node) {
      changed = true;
      var globalName = node.global;
      var subscripts = node.subscripts;
      var value = node.data;
      if (globalName) {
        this.kill(node); // make sure everything is tidied up first
        if (!db[globalName]) db[globalName] = {};
        var obj = db[globalName];
        if (subscripts.length === 0) {
          db[globalName] = value;
        }
        else {
          if (subscripts.length > 1) {
            for (var i = 0; i < (subscripts.length - 1); i++) {
              if (!obj[subscripts[i]]) obj[subscripts[i]] = {};
              obj = obj[subscripts[i]];
            }
          }
          obj[subscripts[subscripts.length - 1]] = value;
        }
        return {
          ok: 1,
          global: globalName,
          result: 0,
          subscripts: subscripts
        };
      }
      else {
        return {
          ok: 0,
          global: '',
          result: 0,
          subscripts: subscripts || ''
        };
      }
      
    };

    this.get = function(node) {
      var globalName = node.global;
      var subscripts = node.subscripts || [];
      var data;
      var defined;
      if (globalName) {
        if (db[globalName]) {
          if (subscripts.length === 0) {
            if (typeof db[globalName] === 'string') {
              data = db[globalName];
              if (isNumeric(data)) data = +data;
              defined = 1;
            }
            else {
              data = '';
              defined = 0;
            }
            return {
              ok: 1,
              global: globalName,
              data: data,
              defined: defined,
              subscripts: subscripts
            }
          }
          else {
            var ok = true;
            var obj = db[globalName];
            if (subscripts.length > 1) {
              for (var i = 0; i < (subscripts.length - 1); i++) {
                if (!obj[subscripts[i]]) {
                  ok = false;
                  break;
                }
                obj = obj[subscripts[i]];
              }
            }
            if (ok) {
              if (typeof obj[subscripts[subscripts.length - 1]] === 'undefined') {
                data = '';
                defined = 0;
              }
              else {
                data = obj[subscripts[subscripts.length - 1]];
                if (isNumeric(data)) data = +data;
                defined = 1;
              }
              return {
                ok: 1,
                global: globalName,
                data: data,
                defined: defined,
                subscripts: subscripts
              }
            }
            else {
              return {
                ok: 1,
                global: globalName,
                data: '',
                defined: 0,
                subscripts: subscripts
              };
            }
          }
        }
        else {
          return {
            ok: 1,
            global: globalName,
            data: '',
            defined: 0,
            subscripts: subscripts
          };
        }
      }
      else {
        return {ok: 0};
      }
    };

    this.data = function(node) {
      var defined;
      var globalName = node.global;
      var subscripts = node.subscripts || [];
      if (globalName) {
        if (db[globalName]) {
          if (subscripts.length === 0) {
            if (typeof db[globalName] === 'string') {
              defined = 1;
            }
            else {
              defined = 10;
            }
            return {
              ok: 1,
              global: globalName,
              defined: defined,
              subscripts: subscripts
            }
          }
          else {
            var ok = true;
            var obj = db[globalName];
            if (subscripts.length > 1) {
              for (var i = 0; i < (subscripts.length - 1); i++) {
                if (!obj[subscripts[i]]) {
                  ok = false;
                  break;
                }
                obj = obj[subscripts[i]];
              }
            }
            if (ok) {
              var type = typeof obj[subscripts[subscripts.length - 1]];
              if (type === 'undefined') {
                defined = 0;
              }
              else {
                defined = 1;
                if (type === 'object') defined = 10;
              }
              return {
                ok: 1,
                global: globalName,
                defined: defined,
                subscripts: subscripts
              }
            }
            else {
              return {
                ok: 1,
                global: globalName,
                defined: 0,
                subscripts: subscripts
              };
            }
          }
        }
        else {
          return {
            ok: 1,
            global: globalName,
            data: '',
            defined: 0,
            subscripts: subscripts
          };
        }
      }
      else {
        return {ok: 0};
      }
    };

    this.increment = function(node) {
      changed = true;
      var value = this.get(node).data;
      if (isNaN(+value)) value = 0;
      var inc = node.increment || 1;
      value = value + inc;
      node.data = value;
      this.set(node);
      return {
        ok: 1,
        global: node.global,
        data: value,
        subscripts: node.subscripts
      };
    };

    this.kill = function(node) {
      changed = true;
      var globalName = node.global;
      var subscripts = node.subscripts || [];
      if (globalName) {
        if (db[globalName]) {
          if (subscripts.length === 0) {
            delete db[globalName];
            return {
              ok: 1,
              global: globalName,
              result: 0,
              subscripts: subscripts
            };
          }
          else {
            var ok = true;
            var obj = db[globalName];
            if (subscripts.length > 1) {
              for (var i = 0; i < (subscripts.length - 1); i++) {
                if (!obj[subscripts[i]]) {
                  ok = false;
                  break;
                }
                obj = obj[subscripts[i]];
              }
            }
            if (ok) {
              if (typeof obj[subscripts[subscripts.length - 1]] !== 'undefined') {
                delete obj[subscripts[subscripts.length - 1]];
              }
              return {
                ok: 1,
                global: globalName,
                result: 0,
                subscripts: subscripts
              };
            }
            else {
              return {
                ok: 1,
                global: globalName,
                result: 0,
                subscripts: subscripts
              };
            }
          }
        }
        else {
          return {
            ok: 1,
            global: globalName,
            result: 0,
            subscripts: subscripts
          };
        }
      }
      else {
        return {ok: 0};
      }
    };

    this.sequence = function(node, direction) {
      var globalName = node.global;
      var subscripts = node.subscripts || [];
      if (globalName) {
        if (db[globalName]) {
          if (subscripts.length > 0) {
            var ok = true;
            var obj = db[globalName];
            if (subscripts.length > 1) {
              for (var i = 0; i < (subscripts.length - 1); i++) {
                if (!obj[subscripts[i]]) {
                  ok = false;
                  break;
                }
                obj = obj[subscripts[i]];
              }
            }
            if (ok) {
              var result;
              var pos;
              var start = subscripts[subscripts.length - 1];
              var array = [];
              var match = false;
              for (var name in obj) {
                array.push(name);
                if (name === start) match = true;
              }
              if (!match && start !== '') array.push(start);
              array.sort();
              if (match) {
                if (direction === 'next') {
                  pos = array.indexOf(start) + 1;
                  if (pos === array.length) {
                    result = '';
                  }
                  else {
                    result = array[pos];
                  }
                }
                else {
                  pos = array.indexOf(start) - 1;
                  result = '';
                  if (pos > 0) result = array[pos];
                }
              }
              else {
                if (start === '') {
                  if (direction === 'next') {
                    result = array[0];
                  }
                  else {
                    result = array[array.length - 1];
                  }
                }
                else {
                  if (direction === 'next') {
                    pos = array.indexOf(start) + 1;
                    if (pos === array.length) {
                      result = '';
                    }
                    else {
                      result = array[pos];
                    }
                  }
                  else {
                    pos = array.indexOf(start) - 1;
                    if (pos < 0) {
                      result = '';
                    }
                    else {
                      result = array[pos];
                    }
                  }
                }
              }
              subscripts[subscripts.length - 1] = result;
              if (isNumeric(result)) result = +result;
              return {
                ok: 1,
                global: globalName,
                result: result,
                subscripts: subscripts
              };
            }
          }
        }
        return {
          ok: 1,
          global: globalName,
          result: '',
          subscripts: subscripts
        };
      }
      return {ok: 0};
    };

    this.order = function(node) {
      return this.sequence(node, 'next');
    };

    this.next = function(node) {
      return this.sequence(node, 'next');
    };

    this.previous = function(node) {
      return this.sequence(node, 'previous');
    };

    this.global_directory = function() {
      var list = [];
      for (var name in db) {
        list.push(name);
      }
      return list;
    };

    this.list = function() {
      console.log(JSON.stringify(db, null, 2));
    };

    this.close = function() {
      clearTimeout(timer);
      fs.writeFileSync('noDB.txt', JSON.stringify(db, null, 1), 'utf-8');
    };

  }

};