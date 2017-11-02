// Generated by Haxe 3.4.2
if (typeof process !== "undefined") if (process.version < "v4.0.0") console.warn("Module " + (typeof(module) == "undefined" ? "" : module.filename) + " requires node.js version 4.0.0 or higher");

(function () { "use strict";
var HxOverrides = function() { };
HxOverrides.cca = function(s,index) {
	var x = s.charCodeAt(index);
	if(x != x) {
		return undefined;
	}
	return x;
};
var Std = function() { };
Std.parseInt = function(x) {
	var v = parseInt(x,10);
	if(v == 0 && (HxOverrides.cca(x,1) == 120 || HxOverrides.cca(x,1) == 88)) {
		v = parseInt(x);
	}
	if(isNaN(v)) {
		return null;
	}
	return v;
};
var haxe_io_Bytes = function() { };
var haxe_io_Eof = function() { };
haxe_io_Eof.prototype = {
	toString: function() {
		return "Eof";
	}
};
var js_node_Fs = require("fs");
var js_node_Http = require("http");
var js_node_Url = require("url");
var js_node_buffer_Buffer = require("buffer").Buffer;
var server_Server = function() { };
server_Server.main = function() {
	var highscore_file = "highscores.json";
	var highscores = sys_FileSystem.exists(highscore_file) ? JSON.parse(js_node_Fs.readFileSync(highscore_file,{ encoding : "utf8"})) : [];
	var server1 = js_node_Http.createServer(function(request,response) {
		var send = function(data,status) {
			response.setHeader("Content-Type","text/json");
			response.setHeader("Access-Control-Allow-Origin","*");
			response.writeHead(status);
			var send1 = JSON.stringify(data);
			response.end(send1);
		};
		var ok = function(data1) {
			send(data1,200);
		};
		var error = function(data2) {
			send(data2,500);
		};
		var params = js_node_Url.parse(request.url,true);
		var query = params.query;
		var _g = params.pathname;
		if(_g == null) {
			error({ error : "Unknown endpoint \"" + params.pathname + "\""});
		} else if(_g == "/highscore") {
			if(Object.prototype.hasOwnProperty.call(query,"score") && Object.prototype.hasOwnProperty.call(query,"name") && Object.prototype.hasOwnProperty.call(query,"client")) {
				highscores.push({ client : query["client"], name : query["name"], score : Std.parseInt(query["score"])});
				ok(highscores);
				var content = JSON.stringify(highscores);
				js_node_Fs.writeFileSync(highscore_file,content);
			} else {
				error({ error : "Unknown endpoint \"" + params.pathname + "\""});
			}
		} else {
			error({ error : "Unknown endpoint \"" + params.pathname + "\""});
		}
		console.log("You got served!");
	});
	server1.listen(5000,"localhost");
};
var sys_FileSystem = function() { };
sys_FileSystem.exists = function(path) {
	try {
		js_node_Fs.accessSync(path);
		return true;
	} catch( _ ) {
		return false;
	}
};
server_Server.main();
})();
