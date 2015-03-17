//"use strict";

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
	this.parallaxMultiplier = { x: 0, y: 0 };
	
	//Store good stuff for CSS
	this.currentParallaxTranslate = {
		x: 0,
		y: 0
	};
	
	this.addTransformCSS = Modernizr.csstransforms3d ? this.addTransformCSS3D : this.addTransformCSSNo3D;
	
	this.isAborted = false;
	this.hasTriedToReload = false;
	//this.roundOpacity = false;
	
	if(this.isImage){
		this.image = new Image();
		this.imagePath = this.$el.data().src;
		//this.roundOpacity = this.imagePath.indexOf("wingFlap") != -1;
	}
};


AEnimatorElement.prototype.handleScrollPositionChange = function(UpdatedScrollPosition){
	this.scrollPosition = UpdatedScrollPosition;
		
	this.isWithinVisibleRange = this.isWithinVisibleRangeOfScrollPosition();
	
	if(this.isWithinVisibleRange && this.keyframesLength){
		this.updateScrollPositionStyle();
	}
};

AEnimatorElement.prototype.handlePassiveParallaxChange = function(UpdatedParallaxMultiplier){
	if(this.passiveParallaxRange){
		this.currentParallaxTranslate = {
			x: this.passiveParallaxRange.x * UpdatedParallaxMultiplier.x,
			y: this.passiveParallaxRange.y * UpdatedParallaxMultiplier.y
		};
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
		
		//if(this.roundOpacity){
		//	this.currentScrollPosStyles.o = Math.round(this.currentScrollPosStyles.o);
		//}
		
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
	var _transformString = "translate3d(" + (this.currentScrollPosStyles.t.x + this.currentParallaxTranslate.x).toFixed(5) + "px, " + (this.currentScrollPosStyles.t.y + this.currentParallaxTranslate.y).toFixed(5) + "px, 0px) ";					
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
	var _transformString = "translate(" + (this.currentScrollPosStyles.t.x + this.currentParallaxTranslate.x).toFixed(5) + "px, " + (this.currentScrollPosStyles.t.y + this.currentParallaxTranslate.y).toFixed(5) + "px) ";					
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