"use strict";

function AEnimator(ParamObj){
	this.paramObj = ParamObj;
	this.jsonPath = ParamObj.jsonPath;
	this.isAutoPlay = ParamObj.autoPlay === true ? true : false;
	this.isAutoLoad = ParamObj.autoLoad === true || this.isAutoPlay ? true : false;
	this.onLoadCompleteCB = ParamObj.onLoadComplete ? ParamObj.onLoadComplete : null;
	this.onLoadProgressCB = ParamObj.onLoadProgress ? ParamObj.onLoadProgress : null;
	this.onUnsupportedCB = ParamObj.onUnsupported ? ParamObj.onUnsupported : null;
	
	this.supportedCSSTransform = this.getSupportedCSSTransform();
	
	console.log(this.supportedCSSTransform);
	
	if(this.supportedCSSTransform == null){
		console.log("Error: Browser does not support Transforms");
		if(this.onUnsupportedCB){
			this.onUnsupportedCB();
		}
		return;
	}

	//This will load the animation data of all AENimator elements
	this.jsonLoader = null;
	this.json = null;
	
	//Container holds all animated elements
	this.$container = null;
	
	this.elementsArray = [];
	this.elementsArrayLength = 0;
	
	this.isLoaded = false;
	
	this.ELEMENT_LOAD_CHUNK_AMOUNT = 3;
	this.elementLoadCount = 0;
	this.elementLoadChunkEndIndex = 0;
	
	if(this.isAutoLoad){
		this.load();
	}
};

AEnimator.prototype.getSupportedCSSTransform = function() {
	var _prefixes = [
		{
			tStyle: "transform",
			cssPrefix: ""
		},
		{
			tStyle: "WebkitTransform",
			cssPrefix: "-webkit-"
		},
		{
			tStyle: "MozTransform",
			cssPrefix: "-moz-"
		},
		{
			tStyle: "OTransform",
			cssPrefix: "-o-"
		},
		{
			tStyle: "msTransform",
			cssPrefix: "-ms-"
		}
	];
	var _div = document.createElement('div');
  		
  for(var i = 0; i < _prefixes.length; i++) {
    if(_div && _div.style[_prefixes[i].tStyle] !== undefined) {
    	return _prefixes[i].cssPrefix;
    }
  }
  return null;
}

AEnimator.prototype.load = function(){
	if(!this.isLoaded){
		this.loadJSON();
	}
};

AEnimator.prototype.loadJSON = function(){
	var _this = this;
	
	if(!this.json){
		this.jsonLoader = new AJAXJSONLoader(this.jsonPath, function(Data){
			_this.json = Data;
			_this.initElements();
		});
	} else {
		this.initElements();
	}
};

AEnimator.prototype.abortLoadJSON = function(){
	if(this.jsonLoader){
		this.jsonLoader.kill();
		this.jsonLoader = null;
	}
};

AEnimator.prototype.initElements = function(){
	this.$container = $(this.json.$id);
	
	for(var i = 0; i < this.json.layerDataArrayLength; i++){
		this.elementsArray.push(new AEnimatorElement(this.json.layerDataArray[i], this.$container));
	}
	this.elementsArrayLength = this.elementsArray.length;
		
	this.loadChunkOfElements(0);
};




AEnimator.prototype.unload = function(){
	this.onLoadCompleteCallback = null;	
	this.abortLoadJSON();
	this.unloadElements();
	
	this.elementLoadCount = this.elementLoadChunkEndIndex = 0;
	
	/*
	if(this.$parallaxElementsContainer){
		this.$parallaxElementsContainer.empty();
		this.$parallaxElementsContainer.remove();
		this.$parallaxElementsContainer = null;
		delete this.$parallaxElementsContainer;
	}
	*/
	
	//this.hide();
};

/*
AEnimator.prototype.scaleAnimationDataScrollPositions = function(){
	this.json.scrollRange *= Modernizr.timelineScalar;
	
	for(var i = 0; i < this.json.layerDataArrayLength; i++){
		var _layerData = this.json.layerDataArray[i];
		_layerData.iS *= Modernizr.timelineScalar;
		_layerData.oS *= Modernizr.timelineScalar;
		
		for(var j = 0; j < _layerData.kL; j++){
			_layerData.k[j].sP  *= Modernizr.timelineScalar
		};
	}
};
*/



/*

Loading Elements (images take a while, solids are instant)

*/


AEnimator.prototype.loadChunkOfElements = function(StartIndex){
	this.elementLoadChunkEndIndex = this.elementsArrayLength < StartIndex + this.ELEMENT_LOAD_CHUNK_AMOUNT ? this.elementsArrayLength : StartIndex + this.ELEMENT_LOAD_CHUNK_AMOUNT;
	
	for(var i = StartIndex; i < this.elementLoadChunkEndIndex; i++){
		this.loadElement(this.elementsArray[i]);
	}
};

AEnimator.prototype.loadElement = function(Element){
	var _this = this;
	
	if(Element.isImage){
		Element.load( function(){
			_this.onLoadElementComplete();
		});
	} else {
		this.onLoadElementComplete();
	}
};

AEnimator.prototype.onLoadElementComplete = function(){
	this.elementLoadCount += 1;
	
	if(this.onLoadProgressCB){
		this.onLoadProgressCB(this.elementLoadCount/this.elementsArrayLength);
	}
	
	if(this.elementLoadCount >= this.elementsArrayLength){
		this.onAllLoadComplete();
	} else if(this.elementLoadCount == this.elementLoadChunkEndIndex && this.elementLoadCount < this.elementsArrayLength){
		this.loadChunkOfElements(this.elementLoadCount);
	}
};

AEnimator.prototype.unloadElements = function(){
	for(var i = 0; i < this.elementsArrayLength; i++){
		this.elementsArray[i].unload();
		this.elementsArray[i] = null;
		delete this.elementsArray[i];
	}
	this.elementsArray = [];
	this.elementsArrayLength = 0;
};


//When everything in this view has completely loaded (except audio, we dont wait for that)

AEnimator.prototype.onAllLoadComplete = function(){
	this.isLoaded = true;
	
	if(this.onLoadCompleteCB){
		this.onLoadCompleteCB();
	}
};

/*
for(var i = 0; i < this.elementsArrayLength; i++){
	this.elementsArray[i].updateCSS();
}
*/













function AEnimatorElement(Data, $Parent){
	this.data = Data;
	this.loadCompleteCallback = null;
	
	// Goodies from Data
	this.$el = $Parent.find("> " + this.data.$id);
	this.inPointScrollPos = this.data.iS;
	this.outPointScrollPos = this.data.oS;
	this.passiveParallaxRange = this.data.pPR;
		
	this.isImage = this.data.iI;
	this.keyframesLength = this.data.kL;
	this.keyframes = this.data.k;
	this.currentScrollPosStyles = this.data.f0S;
	
	// New goodies
	this.isWithinVisibleRange = this.data.iV;
	this.isVisible = this.isWithinVisibleRange;
	
	//Stuff that doesnt need to be calculated all the time
	this.scrollPosition = 0;
		
	this.addTransformCSS = Modernizr.csstransforms3d ? this.addTransformCSS3D : this.addTransformCSSNo3D;
	
	this.isAborted = false;
	this.hasTriedToReload = false;
	
	if(this.isImage){
		this.image = new Image();
		this.imagePath = this.$el.data().src;
	}
};


AEnimatorElement.prototype.handleScrollPositionChange = function(UpdatedScrollPosition){
	this.scrollPosition = UpdatedScrollPosition;
		
	this.isWithinVisibleRange = this.isWithinVisibleRangeOfScrollPosition();
	
	if(this.isWithinVisibleRange && this.keyframesLength){
		this.updateScrollPositionStyle();
	}
};

AEnimatorElement.prototype.updateScrollPositionStyle = function(){
	var _fromKeyframe = this.getPrevKeyframeFromScrollPosition(this.scrollPosition),
		_toKeyframe = this.getNextKeyframeFromScrollPosition(this.scrollPosition),
		_keyframePercent = _fromKeyframe == _toKeyframe ? 1 : (this.scrollPosition - _fromKeyframe.sP) / (_toKeyframe.sP - _fromKeyframe.sP),
		_styleProperty,
		_isOpacityCalculated = false;
		
	if(_fromKeyframe.s.o != null){
		_isOpacityCalculated = true;
		this.currentScrollPosStyles.o = this.getInterpolatedKeyframeStylePropertyValue(_fromKeyframe.s, _toKeyframe.s, _keyframePercent, "o");
		
		if(this.currentScrollPosStyles.o == 0){
			return;
		}
	}
		
	//COMPARES KEY/VALUE CSS STYLES
	for(key in _fromKeyframe.s){
		if(key != "o" || !_isOpacityCalculated){
			_styleProperty = key;
			this.currentScrollPosStyles[_styleProperty] = this.getInterpolatedKeyframeStylePropertyValue(_fromKeyframe.s, _toKeyframe.s, _keyframePercent, _styleProperty);
		}
	}
		
	/*
	OLD BUT GOOD
	for(key in _fromKeyframe.s){
		_styleProperty = key;
		this.currentScrollPosStyles[_styleProperty] = this.getInterpolatedKeyframeStylePropertyValue(_fromKeyframe.s, _toKeyframe.s, _keyframePercent, _styleProperty);
	}
	*/
};

//GET INTERPOLATED KEYFRAME PROPERTY VALUE
AEnimatorElement.prototype.getInterpolatedKeyframeStylePropertyValue = function(FromKeyFrameStyles, ToKeyFrameStyles, KeyFramePercent, StyleProperty){
	if(FromKeyFrameStyles[StyleProperty].x != null || FromKeyFrameStyles[StyleProperty].y != null){
		return {
			x: (FromKeyFrameStyles[StyleProperty].x + ((ToKeyFrameStyles[StyleProperty].x - FromKeyFrameStyles[StyleProperty].x) * KeyFramePercent)),
			y: (FromKeyFrameStyles[StyleProperty].y + ((ToKeyFrameStyles[StyleProperty].y - FromKeyFrameStyles[StyleProperty].y) * KeyFramePercent))	
		};
	}
	else {
		return FromKeyFrameStyles[StyleProperty] + ((ToKeyFrameStyles[StyleProperty] - FromKeyFrameStyles[StyleProperty]) * KeyFramePercent);
	}
};

AEnimatorElement.prototype.updateCSS = function(){
	var _css = {};
	
	if(this.isWithinVisibleRange){
		if(!this.currentScrollPosStyles.o){
			this.hide();
		} else {
			var _transformOriginString = this.currentScrollPosStyles.tO.x.toFixed(5) + "px " + this.currentScrollPosStyles.tO.y.toFixed(5) + "px",
			_css = {
				"transform-origin": _transformOriginString,
				"-webkit-transform-origin": _transformOriginString,
				"-moz-transform-origin": _transformOriginString,
				"-o-transform-origin": _transformOriginString,
				"-ms-transform-origin": _transformOriginString,
				opacity: this.currentScrollPosStyles.o
			};
		
			_css = this.addTransformCSS(_css);
			
			this.$el.css(_css);
			
			this.show();
		}
	} else {
		this.hide();
	}
};

AEnimatorElement.prototype.isWithinVisibleRangeOfScrollPosition = function(){
	return this.inPointScrollPos <= this.scrollPosition && this.scrollPosition <= this.outPointScrollPos;
};

//GETS PREV KEYFRAME
AEnimatorElement.prototype.getPrevKeyframeFromScrollPosition = function(ScrollPosition){
	for(var i = this.keyframesLength-1; 0 <= i; i--){
		if(this.keyframes[i].sP <= ScrollPosition || i == 0){
			return this.keyframes[i];
		}
	}
};

//GETS NEXT KEYFRAME
AEnimatorElement.prototype.getNextKeyframeFromScrollPosition = function(ScrollPosition){
	for(var i = 0; i < this.keyframesLength; i++){
		if(this.keyframes[i].sP >= ScrollPosition || i == this.keyframesLength-1){
			return this.keyframes[i];
		}
	}
};

AEnimatorElement.prototype.addTransformCSS3D = function(CSS){
	var _transformString = "translate3d(" + this.currentScrollPosStyles.t.x.toFixed(5) + "px, " + this.currentScrollPosStyles.t.y.toFixed(5) + "px, 0px) ";					
	_transformString += "scale(" + this.currentScrollPosStyles.s.x.toFixed(5) + ", " + this.currentScrollPosStyles.s.y.toFixed(5) + ") ";
	_transformString += "rotate(" + this.currentScrollPosStyles.r.toFixed(5) + "deg) ";
		
	CSS["transform"] = _transformString;
	CSS["-webkit-transform"] = _transformString;
	CSS["-moz-transform"] = _transformString;
	CSS["-o-transform"] = _transformString;
	CSS["-ms-transform"] = _transformString;
			
	return CSS;
};

AEnimatorElement.prototype.addTransformCSSNo3D = function(CSS){
	var _transformString = "translate(" + this.currentScrollPosStyles.t.x.toFixed(5) + "px, " + this.currentScrollPosStyles.t.y.toFixed(5) + "px) ";					
		_transformString += "scale(" + this.currentScrollPosStyles.s.x.toFixed(5) + ", " + this.currentScrollPosStyles.s.y.toFixed(5) + ") ";
		_transformString += "rotate(" + this.currentScrollPosStyles.r.toFixed(5) + "deg) ";
		
	CSS["transform"] = _transformString;
	CSS["-webkit-transform"] = _transformString;
	CSS["-moz-transform"] = _transformString;
	CSS["-o-transform"] = _transformString;
	CSS["-ms-transform"] = _transformString;
			
	return CSS;
};

AEnimatorElement.prototype.show = function(){
	if(!this.isVisible){
		this.isVisible = true;
		this.$el.addClass("visible");
		this.$el.removeClass("hidden");
	}
};

AEnimatorElement.prototype.hide = function(){
	if(this.isVisible){
		this.isVisible = false;
		this.$el.addClass("hidden");
		this.$el.removeClass("visible");
	}
};

AEnimatorElement.prototype.load = function(LoadCompleteCallback){
	var _this = this;
	
	this.loadCompleteCallback = LoadCompleteCallback;
	
	this.tryLoad();
};

AEnimatorElement.prototype.tryLoad = function(){
	var _this = this;
	
	this.image.onload = null;
	this.image.onerror = null;
	
	this.image.onload = function(){
		if(_this.image && _this.image.src){
			_this.$el.attr("src", _this.image.src);
			if(_this.loadCompleteCallback){
				_this.loadCompleteCallback();
			}
		}
	};
	
	this.image.onerror = function(){
		if(_this.isAborted){
			console.log("!!! IMAGE ABORT: " + _this.image.src);
		} else {
			if(!_this.hasTriedToReload){
				console.log("!!! IMAGE ERROR FIRST TIME: " + _this.image.src);
				_this.hasTriedToReload = true;
				_this.tryLoad();
			} else {
				console.log("!!! IMAGE ERROR SECOND TIME: " + _this.image.src);	
			}
		}
	};
	
	this.image.src = this.imagePath;
};

AEnimatorElement.prototype.unload = function(){
	this.loadCompleteCallback = null;
	this.isAborted = true;
	if(this.isImage){
		this.image = null;
		this.$el.attr("src", "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
		this.$el = null;
	}
};


















function AJAXJSONLoader(DataPath, CallbackFN){
	this.dataPath = DataPath;
	this.callbackFN = CallbackFN;
	
	this.loader = null;
	this.isAborted = false;
	this.hasTriedToReload = false;
	
	this.load();
};


AJAXJSONLoader.prototype.load = function(){
	var _this = this;
	
	this.loader = $.getJSON( this.dataPath, function(Data) {
		_this.onLoadComplete(Data);
	}).error( function() { _this.onLoadError(); });
};

AJAXJSONLoader.prototype.onLoadComplete = function(Data){	
	if(this.callbackFN){
		this.callbackFN(Data);	
	}
};

AJAXJSONLoader.prototype.onLoadError = function(){
	if(this.isAborted){
		console.log("!!! JSON ABORT: " + this.dataPath);
	} else {
		if(!this.hasTriedToReload){
			console.log("!!! JSON ERROR FIRST TIME: " + this.dataPath);
			this.hasTriedToReload = true;
			this.load();
		} else {
			console.log("!!! JSON ERROR SECOND TIME: " + this.dataPath);
		}
	}	
};

AJAXJSONLoader.prototype.kill = function(){
	this.isAborted = true;
	this.callbackFN = null
	if(this.loader){
		this.loader.abort();
		this.loader = null;
	}
};