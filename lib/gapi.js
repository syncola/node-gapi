/*  gapi.js  */ 
/*  produces a usable consumer of a Google REST api using Google's api discovery schema */

/* usage */
/*  var client = require('gapi').build('calendar', 'v3');
 *  client.auth('httpss://www.googleapis.com/auth/calendar', clientId);
 *  client.run(function (calendar) {
 *    calendar.acl.list(myCalId); 
 *  });
*/
var https = require('https');
var format = require('strformat');
var oath = require('oauth');

var DISCOVERY_HOST = 'www.googleapis.com';
var DISCOVERY_PATH = '/discovery/v1/apis/{api}/{apiVersion}/rest';


exports.build = function (serviceId, serviceVer) {
 var servicePath = format(DISCOVERY_PATH, {api: serviceId, apiVersion : serviceVer });
 var client = {};
 var creds; 
 
 function _auth(scope, clientId, secret, immediate) {
   /*
   if (undefined == immediate) { 
     immediate = true;
   }
  
   // TODO 
   creds = doOAthStuff(scope, clientId, secret); 
   if (creds) { return true; }
   else { return false; }
   */
  } 

  function _getSchema(fun) {
    var schema = '';
    var options = {
      host: DISCOVERY_HOST,
      path: servicePath,
      method: 'GET'
    };
    var req = https.request(options, function(response) {
      response.setEncoding('utf8');
      response.on('data', function (data) {
        schema += data;
      });
      response.on('end', function () {
        _processSchema(schema, fun);
      });
      response.on('error', function (msg) {
        console.log(msg);
      }); 
    });
    req.end();
  }

  function _processSchema(schema, cb) { 
    var obj = JSON.parse(schema);
    client.docs = {};
    
    Object.keys(obj.resources).forEach(function(k) {
      Object.keys(obj.resources[k].methods).forEach(function(meth) {
        var m = obj.resources[k].methods[meth];
        client[k] = client[k] || {};
        client[k][meth] = _createMethod(obj, m.path, m.httpsMethod);
        client.docs[k] = client.docs[k] || {};
        client.docs[k][meth] = client.docs[k][meth] || {};
        client.docs[k][meth].desc = m.description;
        client.docs[k][meth].path = m.path;
        client.docs[k][meth].params = m.parameters;
        if (m.request) {
          if (m.request['$ref']) {
            client.docs[k][meth].request = obj.schemas[m.request['$ref']];
          }
        }
        if (m.response) {
          if (m.response['$ref']) {
            client.docs[k][meth].response = obj.schemas[m.response['$ref']];
          }
        }
      });
    });
    cb(client);
  }
 
  function _createMethod(obj, path, httpMethod) {

    return function(urlParams, postParams, cb) {
      var url = format(path, urlParams);
      var response = '';
      var options = {
        host: obj.rootUrl.slice(8,-1),
        path: url,
        method: httpMethod
      }
      req = https.request(options, function (resp) {
        resp.setEncoding('utf8');
        resp.on('data', function(data) {
          response += data;
        });
        resp.on('end', function() {
          if (response.length > 0) {
            cb(JSON.parse(response));
          }
          else {
            cb({});
          }
        });

      });
      if ( (! httpMethod in ['GET', 'DELETE']) && postParams) {
        req.write(JSON.stringify(postParams));
      }
      req.end();
    };
  }

  function _run(cb) { 
    _getSchema(cb); 
  }
  
  return { 
    run : _run,
    auth : _auth
  };
}
