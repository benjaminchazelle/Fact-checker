var Services = require("./services.js");
var Async = require("./async.js");

class DBpediaSimilarity {
	
	constructor(rawFact, signalCallback) {
		
		this.rawFact = rawFact;
		this.lemmatizedFact = null;
		this.fact = [];
		this.entities = [];
		this.entitiesLabels = [];
		this.entitiesImages = {};
		this.signalCallback = signalCallback || function () {};
		
		this.knoweldges = {};
		
		this.researchEntities(rawFact);
		
	}
	
	researchEntities(rawFact) {
		
		var self = this;
		
		Services.spotlight(rawFact, function (entities) {						
			
			self.entities = Array.from(new Set(entities));
			
			self.signalCallback("Entities", entities);
						
			for(var entity of self.entities) {
				
				self.entitiesLabels.push(self.getLabelFromEntity(entity));
				
			}
			
			var async = new Async("researchEntities");
			
			async.wait(self.normalizeFact(rawFact, async.defer()));
			
			async.wait(self.learnAboutEntities(async.defer()));
			
			async.then(function () {
				
				self.matchingKnowledges();
				
			});
			
		});
		
	}
	
	getLabelFromEntity(entity) {
		
		return entity.substring(entity.lastIndexOf("/") + 1).replace(/_/g, " ").replace(/\./g, "");
		
	}
	
	enhanceSentence(sentence, doneCallback) {
		
		var lemmatized = Services.lemmatize(sentence);
		
		Services.datamuse(lemmatized.join(" "), function(relatedWords) {
			
			var enhancedSentence = lemmatized;
			
			for(var i = 0; i < relatedWords.length && i < 25; i++) {
				
				enhancedSentence.push(relatedWords[i].word);
				
			}

			doneCallback(enhancedSentence);
		});
		
	}
	
	normalizeFact(rawFact, doneCallback) {
		
		var self = this;
		
		for(const entity of this.entities) {
			
			rawFact = rawFact.replace(this.getLabelFromEntity(entity), "");
			
		}
		
		this.lemmatizedFact = rawFact;
		
		this.enhanceSentence(rawFact, function(enhancedSentence) {
			
			self.fact = enhancedSentence;
			
			self.signalCallback("EnhancedFact", {enhancedSentence : enhancedSentence, lemmatizedFact : self.lemmatizedFact})
			
			doneCallback();
		});

	}
	
	learnAboutEntity(entity, doneCallback) {
		
		var self = this;
		
		const endl = "\n";
		
		var query = '';
		query += 'SELECT * WHERE {' + endl;
		query += '	<' + entity + '> ?p ?o.' + endl;
		query += '	?p ?dt ?d.' + endl;
		query += '' + endl;
		query += '	FILTER(' + endl;

		query += '		(isLiteral(?o) && (lang(?o)= "" || langMatches(lang(?o), "EN")))' + endl;
		query += '		||' + endl;
		query += '		(!isLiteral(?o) && (STRSTARTS(STR(?o), "http://dbpedia.org/") || STRSTARTS(STR(?o), "http://commons.wikimedia.org/")))' + endl;

		query += '	).' + endl;
		 
		query += '	FILTER(' + endl;

		query += '			(' + endl;
		query += '				?dt = <http://www.w3.org/2000/01/rdf-schema#label>' + endl;
		query += '				&& (lang(?d) = "" || langMatches(lang(?d), "EN"))' + endl;
		query += '			)' + endl;

		query += '			||' + endl;

		query += '			(' + endl;
		query += '				?dt = <http://www.w3.org/2000/01/rdf-schema#comment>' + endl;
		query += '				&& (lang(?d) = "" || langMatches(lang(?d), "EN"))' + endl;
		query += '			)' + endl;
		query += '	).' + endl;
		query += '}';
		
		Services.sparqlQuery(query, function(results) {
			
			self.formalizeKnoweldge(entity, results.results.bindings);
			
			self.signalCallback("AckLearnAboutEntity", null);
			
			doneCallback();
		});		
		
	}
	
	formalizeKnoweldge(entity, knoweldges) {
		
		var s = this.getLabelFromEntity(entity);
				
		var spoCollection = [];
		
		for(const knoweldge of knoweldges) {
			
			var image = null;	
			
			if(knoweldge.p.value == "http://dbpedia.org/property/image") {
				image = "http://commons.wikimedia.org/wiki/Special:FilePath/" + knoweldge.o.value + "?width=300";
			} else if(knoweldge.o.type == "uri" && knoweldge.o.value.indexOf("http://commons.wikimedia.org/") != -1) {
				image = knoweldge.o.value;
			}
			 
			if(image != null)  {
				
				if(!(s in this.entitiesImages)) {
					this.entitiesImages[s] = image;
					
					this.signalCallback("EntityImage", {entity : entity, image : this.entitiesImages[s]});
				}
				
				continue;
			}			
			
			if(knoweldge.d.value == "Reserved for DBpedia.") {
				continue;
			}

			if(knoweldge.d.value == "Link from a Wikipage to another Wikipage") {
				continue;
			}
			
			var p = knoweldge.d.value.toLowerCase();
			
			var o = (knoweldge.o.type == "uri") ? this.getLabelFromEntity(knoweldge.o.value) : knoweldge.o.value;

			spoCollection.push({
				text : s + " " + this.verbify(p) + " " + o + ".",
				graph : knoweldge
			});

		}
		
		for(const spo of spoCollection) {
		
			var sentences = spo.text.split(".");
			
			for(const sentence of sentences) {							
				
				var sentenceWithoutEntities = sentence;
				
				var localEntities = [];
				
				for(const entityLabel of this.entitiesLabels) {										
					
					var oldSentenceWithoutEntities = sentenceWithoutEntities;
					
					sentenceWithoutEntities = sentenceWithoutEntities.split(entityLabel).join(""); //removeAll entityLabel					
					
					var labelFragments = entityLabel.match(/[A-Z]\S+/g);										
					
					var fragmentMatch = false;
					
					for(var labelFragment of labelFragments) {
						
						if(sentence.indexOf(labelFragment) != -1) {
							
							fragmentMatch = true;
							break;
							
						}
						
					}					
					
					if(fragmentMatch) {
						localEntities.push(entityLabel);
					}
				}
				
				if(localEntities.length >= 2) {
														
					var lemmatized = Services.lemmatize(sentenceWithoutEntities);									
					
					this.knoweldges[lemmatized.join(" ")] = {
						originalSentence : sentence,
						graph : spo.graph,
						entities : localEntities
					};										
					
				}
				
			}
			
		}
				
	}
	
	verbify(sentence) {
		
		//rajouter be si besoin
		
		return sentence;
		
	}
	
	learnAboutEntities(doneCallback) {
		
		var self = this;
		
		var async = new Async("learnAboutEntities");
		
		for(const entity of this.entities) {
			
			async.wait(this.learnAboutEntity(entity, async.defer()));
			
		}
		
		this.signalCallback("WaitLearnAboutEntities", this.entities.length);
		
		async.then(function () {
			
			self.signalCallback("AckLearnAboutEntities", null);
			
			self.enhanceKnowledges(doneCallback);
			
		});
		
		
	}
	
	enhanceKnowledge(knoweldge, doneCallback) {
		
		var self = this;
		
		this.enhanceSentence(knoweldge, function(enhancedSentence) {
			
			self.knoweldges[knoweldge].enhanced = enhancedSentence;
			
			self.signalCallback("AckEnhanceKnowledge", null);
			
			doneCallback();
		});
		
	}
	
	enhanceKnowledges(doneCallback) {
		
		var self = this;
		
		var async = new Async("enhanceKnowledges");
		
		for(const knoweldge in this.knoweldges) {
			
			async.wait(this.enhanceKnowledge(knoweldge, async.defer()));
			
		}
		
		this.signalCallback("WaitEnhanceKnowledges", Object.keys(this.knoweldges).length);
		
		async.then(function () {
			
			self.signalCallback("AckEnhanceKnowledges", null);
			
			doneCallback();
			
		});		
		
	}
	
	matchingKnowledges() {	
		
		
		
		var matchKnowledges = [];
		
		var matchTriplets = [];
		
		var matchSentences = [];
		
		var results = [];
		for(const knoweldge in this.knoweldges) {
			
			var sentence = this.knoweldges[knoweldge].originalSentence;
			
			var matchWords = {};
			
			for(const factWord of this.fact) {
				
				for(const knoweldgeWord of this.knoweldges[knoweldge].enhanced) {
					
					if(knoweldgeWord == factWord) {
						
						if(!(knoweldgeWord in matchWords)) {
							matchWords[knoweldgeWord] = 0;
						}
						
						matchWords[knoweldgeWord]++;
						
					}
					
				}
				
			}
			
			if(Object.keys(matchWords).length > 0) {
				
				var sentenceScore = 0;
				
				var lemmatizedFromRaw = this.lemmatizedFact.trim().split(" ");
				
				for(var word in matchWords) {
					
					var coef = (lemmatizedFromRaw.indexOf(word) != -1) ? 3 : 1;
					
					sentenceScore += coef * Services.getWordScore(word);
				
				}
				
				sentenceScore = sentenceScore * this.knoweldges[knoweldge].entities.length;
								
				results.push({
					triplet : {
						s : this.knoweldges[knoweldge].graph.p.value,
						p : this.knoweldges[knoweldge].graph.d.value,
						pt : this.knoweldges[knoweldge].graph.dt.value,
						o : this.knoweldges[knoweldge].graph.o.value
					},						
					sentence : sentence,
					matchWords : matchWords,
					sentenceScore : sentenceScore,
					matchEntities : this.knoweldges[knoweldge].entities,
					rateMatchEntities : Math.round(this.knoweldges[knoweldge].entities.length/this.entities.length*100)

				})
			}
			
		}
		
		results.sort(function(a, b) {
		  return b.sentenceScore - a.sentenceScore;
		});
		
		this.signalCallback("Results", results);
		
	}	

};

module.exports = DBpediaSimilarity;