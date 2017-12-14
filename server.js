var express = require('express');
var app = express();
var http = require('http').Server(app);
var { spawn } = require('child_process');
var io = require('socket.io')(http);
var DBpediaSimilarity = require("./DBpediaSimilarity.js");

app.use('/', express.static(__dirname + '/webapp'));

io.on('connection', function(socket){
	
	socket.on('app', function(message){
		
		new DBpediaSimilarity(message.request, function(signal, value) {
			
			socket.emit("app", {
				session : message.session,
				signal : signal,
				content : value
			});
			
		});
		
		socket.emit("app", {
			session : message.session,
			signal : "Start",
			content : null
		});		
		
		
	});
	
	
}); 

http.listen(4000, function(){
  console.log('Fact Checker server listening on port 4000');
});

