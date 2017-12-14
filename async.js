class Async {
	
	constructor(name) {
		
		this.name = name;
		
		this.todo = 0;
		this.done = 0;
		
		this.callback = function() {};
		
	}
	
	wait() {
		
		this.todo++;
		
	}
	
	defer() {
		
		var self = this;
		
		return function () {
			
			self.done++;
			
			// console.log("Async end", self.name, " ", self.done + "/" + self.todo);
			
			if(self.todo == self.done) {
				
				self.callback();
				
			}
		
		};
		
	}
	
	then(callback) {
		
		this.callback = callback;
		
		if(this.todo == 0) {
			this.callback();
		}
		
	}
	
}

module.exports = Async;