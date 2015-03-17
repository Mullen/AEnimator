function AJAXDataLoader(DataPath, CallbackFN){
	this.dataPath = DataPath;
	this.callbackFN = CallbackFN;
	
	this.loader = null;
	this.isAborted = false;
	this.hasTriedToReload = false;
	
	this.load();
};


AJAXDataLoader.prototype.load = function(){
	var _this = this;
	
	this.loader = $.getJSON( this.dataPath, function(Data) {
		_this.onLoadComplete(Data);
	}).error( function() { _this.onLoadError(); });
};

AJAXDataLoader.prototype.onLoadComplete = function(Data){
	//console.log("JSON LOADED: " + this.dataPath);
	
	if(this.callbackFN){
		this.callbackFN(Data);	
	}
};

AJAXDataLoader.prototype.onLoadError = function(){
	if(this.isAborted){
		console.log("!!! JSON ABORT: " + this.dataPath);
	} else {
		if(!this.hasTriedToReload){
			console.log("!!! JSON ERROR FIRST TIME: " + this.dataPath);
			this.hasTriedToReload = true;
			this.load();
		} else {
			if(Modernizr.isEnvironmentProduction){
				console.log("!!! JSON ERROR SECOND TIME: " + this.dataPath);
			} else {
				alert("!!! JSON ERROR SECOND TIME: " + this.dataPath);
			}
		}
	}	
};

AJAXDataLoader.prototype.kill = function(){
	this.isAborted = true;
	this.callbackFN = null
	if(this.loader){
		this.loader.abort();
		this.loader = null;
	}
};