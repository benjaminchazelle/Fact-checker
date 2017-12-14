var execSync = require('child_process').execSync;
var apiSpotlight = require('dbpedia-spotlight');
var Lemmatizer = require("javascript-lemmatizer");
var datamuse = require("datamuse");
var SparqlClient = require('sparql-client');
var fs = require('fs');
var wordBank = JSON.parse(fs.readFileSync("wordBank.json").toString()).bank;

class WS {
	
	constructor() {
		
		this.sparqlClient = new SparqlClient('https://dbpedia.org/sparql');
		
	}
	
	getWordScore(word) {
		return 1;
		var index = wordBank.indexOf(word);
		
		return (index == -1) ? 1 : index / wordBank.length;
		
	}	
	
	sparqlQuery(query, callback) {
		this.sparqlClient.query(query).execute(function (e, r) {
			callback(r);
		});
	}
	
	searchGoogle(query, offset) {
		return execSync("QUERY=" + query + " OFFSET=" + offset + " ./queryGoogle.sh").toString().trim().split("\n");		
	}
	
	datamuse(query, callback) {
		
		datamuse.request("words?ml=" + query).then(callback).catch(callback);
		
	}
	
	lemmatize(sentence) {
			
		var lemmatizer = new Lemmatizer();
		
		sentence = sentence.replace(/[,;:!\?]/g, "");
		
		sentence = sentence.replace(/ +/g, " ");
		
		var words = sentence.toLowerCase().split(" ");
		
		var newSentence = [];
		
		for(var word of words) {
			
			var lemmas = lemmatizer.lemmas(word,  'verb');
			
			if(lemmas.length > 0 && lemmas[0][1] != "") {
				newSentence.push(lemmas[0][0]);
			}
			
		}
		
		return newSentence;
		
	}
	
	spotlight(text, cb) {

		apiSpotlight.fixToEndpoint('english');
		
		apiSpotlight.configEndpoints(
			{
			  "english": {
			  protocol:'http:',
			  host:'model.dbpedia-spotlight.org',
			  path:'/en/annotate',
			  port:'80',
			  confidence:0.2
			  }
			}
		);
		
		apiSpotlight.annotate(text, function (anotations) {
		  var res = anotations.response.Resources;
		  var entities = [];
		  
		  for (var i in res) { 
			entities.push(res[i]['@URI'] );
		  }

		  cb(entities);
		});
	}	
	
}

module.exports = new WS();