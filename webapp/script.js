document.querySelector("input").onkeypress = function(e){
	if (!e) e = window.event;
	var keyCode = e.keyCode || e.which;
	if (keyCode == '13'){
		document.querySelector("button").click();
		return false;
	}
	
	
}

var SESSION = null;

var socket = io();

document.querySelector("button").onclick = function () {

	var query = document.querySelector("input").value;
	
	SESSION = Date.now();
	
	socket.emit("app", {
		session : SESSION,
		request : query
	});
	
	document.querySelector("#result").innerHTML = "";

};

function getLabel(entity) {
	
	return entity.substring(entity.lastIndexOf("/") + 1).replace(/_/g, " ").replace(/\./g, "");
	
}

function progress(percent) {

	document.querySelector(".progressbar div").style.width = Math.floor(percent) + "%";
	document.querySelector(".progressbar div").style.opacity = 1;
	
	if(percent == 100) {
		setTimeout(function () {
			document.querySelector(".progressbar div").style.opacity = 0;
			
		}, 1000);
	}
}

socket.on('app', function(message) {

	if(message.session == SESSION) {
	console.log(message);
	
		if(message.signal == "Start") {
			document.querySelector(".progressbar").innerHTML = '<div style="opacity:0;width:0%;"></div>';
			
			setTimeout(function () {
				progress(10);
			}, 100);
			
		}
		
		if(message.signal == "WaitLearnAboutEntities") {
			progress(35);
		}
		
		if(message.signal == "WaitEnhanceKnowledges") {
			progress(65);
		}
		
		
	
		if(message.signal == "Entities") {
		
			var entities = message.content;
			
			var html = '<div class="line">';
			
			for(var e in entities) {
	
				html += '<div id="' + entities[e] + '" class="tile entity">';
				html += '	<div  class="background">';				
				html += '		' + getLabel(entities[e]);
				html += '	</div>';
				html += '</div>';
			
			}
			
			html += '</div>';
			
			document.querySelector("#result").innerHTML = html + document.querySelector("#result").innerHTML;
		
		}

		if(message.signal == "EntityImage") {
		
			var image = message.content;
			
			var loader = new Image();
			
			if(image.image != "" && image.image != null) {
			
				loader.onload = function () {
					document.getElementById(image.entity).style.backgroundImage = "url('" + encodeURI(image.image) + "')";
				}
				
				loader.src = image.image;
			
			}
		
		}
		
	
		if(message.signal == "EnhancedFact") {
		
			var html = '<div class="line">';
	
				html += '<div id="cloud" class="tile"></div>';
			
			html += '</div>';
			
			document.querySelector("#result").innerHTML = html + document.querySelector("#result").innerHTML;
			
			

			var words = [];
			
			for(var w in message.content.enhancedSentence) {
			
				words.push({
					text: message.content.enhancedSentence[w],
					weight: message.content.enhancedSentence.length - w
				});
			
			}

			$('#cloud').jQCloud(words);

		}
		

		if(message.signal == "Results") {
		
		
		
			var html = "";
		
			for(var i = 0; i < message.content.length && i < 3; i++) {
			
				var result = message.content[i];
			
				html += '<div class="line">';
				html += '		<div class="tile result result-'+i+'">';
				html += '			<h1>'+ result.sentence +'</h1>';
				html += '			<h4>Entities matchs : '+ result.matchEntities.join(", ") +' ('+result.rateMatchEntities+'%)</h4>';
				html += '			<h4>Words matchs : '+ Object.keys(result.matchWords).join(", ") +' (score '+ result.sentenceScore +')</h4>';
				html += '			<i>Depuis DBpedia </i>';
				html += '		</div>';
				html += '	</div>';	
				html += '</div>';
				
			}
			
			if(message.content.length == 0) {
			
				html += '<div class="line">';
				html += '		<div class="tile result result-'+i+'">';
				html += '			<h1>Nous n\'avons pas connaissance de ce fait =\'(</h1>';
				html += '		</div>';
				html += '	</div>';	
				html += '</div>';
			
			}
			
			document.querySelector("#result").innerHTML = html + document.querySelector("#result").innerHTML;

			progress(100);
		}
		
	

	}
		
		
		
		
	
});