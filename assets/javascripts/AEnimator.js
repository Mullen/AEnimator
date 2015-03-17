"use strict";

function ParallaxSection(App, Data, $AEParallaxContainer, PreloaderDisplay, SecondaryContentScrollManager, SecondaryContentModalManager, ChapterPovEnd){
	this.app = App;
	this.chapterPovEssentialData = Data.chapterPovEssentialData;
	this.scaleEssentialDataSecondaryScrollPositions();
	this.audioArray = Data.audioArray;

	this.$aeParallaxContainer = $AEParallaxContainer;
	this.preloaderDisplay = PreloaderDisplay;
	this.secondaryContentScrollManager = SecondaryContentScrollManager;
	this.secondaryContentModalManager = SecondaryContentModalManager;
	this.chapterPovEnd = ChapterPovEnd;

	//This will load the animation data of all parallax elements
	this.chapterAnimationJSONLoader = null;
	this.chapterAnimationJSON = null;
	
	//This is for loading secondary content data
	this.secondaryContentJSONLoadArray = [];
	this.secondaryContentJSONLoadCount = 0;
	
	//This is for loading parallax elements
	this.$parallaxElementsContainer = null;
	this.parallaxElementsArray = [];
	this.parallaxElementsArrayLength = [];
	this.parallaxElementLoadCount = 0;
	
	this.PARALLAX_ELEMENT_LOAD_CHUNK_AMOUNT = 3;
	this.parallaxElementLoadChunkEndIndex = 0;
	
	//This is the total of all secondary content data and also parallax elements (usually async images to load)
	this.totalAsyncLoadAmount = 0;
	this.totalAsyncLoadCount = 0;
	
	//This is for keeping track of update cycling
	this.isScrollSettled = true;
	this.isPassiveParallaxSettled = true;
	this.isParallaxElementsCSSUpdating = false;
	
	// This little beaut is gonna handle the simulated/native scroll.
	this.scrollManager = null;
	
	// This will control tilt/mouse move parallax influence
	this.passiveParallaxInputManager = null;
	
	this.onLoadCompleteCallback = null;
	
	this.is10PercentViewed = false;
	this.is25PercentViewed = false;
	this.is50PercentViewed = false;
	this.is75PercentViewed = false;
	this.is90PercentViewed = false;
	
	this.hasBeenViewed = false;
};

ParallaxSection.prototype.scaleEssentialDataSecondaryScrollPositions = function(){
	for(var i = 0; i < this.chapterPovEssentialData.secondaryContentPositionArrayObjLength; i++){
		this.chapterPovEssentialData.secondaryContentPositionArrayObj[i].sP *= Modernizr.timelineScalar;
		
		if(i > 0 && (this.chapterPovEssentialData.secondaryContentPositionArrayObj[i].sP - this.chapterPovEssentialData.secondaryContentPositionArrayObj[i-1].sP < 145)){
			this.chapterPovEssentialData.secondaryContentPositionArrayObj[i].sP = this.chapterPovEssentialData.secondaryContentPositionArrayObj[i-1].sP + 145;
		}
	}
};

ParallaxSection.prototype.load = function(OnLoadCompleteCallback){
	this.onLoadCompleteCallback = OnLoadCompleteCallback;
	this.preloaderDisplay.show();
	this.loadChapterAnimationJSON();
};

ParallaxSection.prototype.unload = function(){
	this.destroyScrollManager();
	this.destroyPassiveParallaxInputManager();
	this.chapterPovEnd.hide();
	
	this.secondaryContentScrollManager.unload();
	this.secondaryContentModalManager.unload();

	this.onLoadCompleteCallback = null;

	this.cancelParallaxElementsCSSUpdate();
	
	this.abortLoadChapterAnimationJSON();
		
	if(this.app.audioManager){
		this.app.audioManager.unload();
	}
	
	if(this.app.voiceOverBox){
		this.app.voiceOverBox.hide();
	}
	
	this.unloadParallaxElements();
	this.abortLoadAllSecondaryJSON();
	
	this.totalAsyncLoadCount = this.secondaryContentJSONLoadCount = this.parallaxElementLoadCount = this.parallaxElementLoadChunkEndIndex = 0;
	
	if(this.$parallaxElementsContainer){
		this.$parallaxElementsContainer.empty();
		this.$parallaxElementsContainer.remove();
		this.$parallaxElementsContainer = null;
		delete this.$parallaxElementsContainer;
	}
	
	this.hide();
};

ParallaxSection.prototype.loadChapterAnimationJSON = function(){
	var _this = this;
	
	if(!this.chapterAnimationJSON){
		this.chapterAnimationJSONLoader = new AJAXDataLoader(this.chapterPovEssentialData.chapterAnimationJSONPath, function(Data){
			_this.chapterAnimationJSON = Data;
			_this.scaleAnimationDataScrollPositions();
			
			_this.onLoadChapterAnimationJSONComplete();
		});
	} else {
		this.onLoadChapterAnimationJSONComplete();
	}
};

ParallaxSection.prototype.scaleAnimationDataScrollPositions = function(){
	this.chapterAnimationJSON.scrollRange *= Modernizr.timelineScalar;
	
	for(var i = 0; i < this.chapterAnimationJSON.layerDataArrayLength; i++){
		var _layerData = this.chapterAnimationJSON.layerDataArray[i];
		_layerData.iS *= Modernizr.timelineScalar;
		_layerData.oS *= Modernizr.timelineScalar;
		
		for(var j = 0; j < _layerData.kL; j++){
			_layerData.k[j].sP  *= Modernizr.timelineScalar
		};
	}
};

ParallaxSection.prototype.abortLoadChapterAnimationJSON = function(){
	if(this.chapterAnimationJSONLoader){
		this.chapterAnimationJSONLoader.kill();
		this.chapterAnimationJSONLoader = null;
	}
};

ParallaxSection.prototype.onLoadChapterAnimationJSONComplete = function(){
	var _template = Handlebars.compile($(this.chapterAnimationJSON.$hbId).html()),
			_templatedMarkupString = String(_template());	
			
	this.$aeParallaxContainer.append(_templatedMarkupString);
	this.$parallaxElementsContainer = this.$aeParallaxContainer.find("> " + this.chapterAnimationJSON.$id);
	
	this.initParallaxElements();
	
	this.totalAsyncLoadAmount = this.chapterPovEssentialData.secondaryContentPositionArrayObjLength + this.parallaxElementsArrayLength;
	
	this.loadChunkOfParallaxElements(0);
	this.loadAllSecondaryJSON();
	
	if(this.app.audioManager){
		this.app.audioManager.load(this.audioArray);
	}
};


/*

Loading Parallax Elements (images take a while, solids are instant)

*/

ParallaxSection.prototype.initParallaxElements = function(){
	var _this = this,
		_layerData,
		_$elToRemove
	
	for(var i = 0; i < this.chapterAnimationJSON.layerDataArrayLength; i++){
		_layerData = this.chapterAnimationJSON.layerDataArray[i];
		
		if(Modernizr.isInputTouchOnly && _layerData.oHQ && _layerData.oHQ == 1){
			_$elToRemove = this.$parallaxElementsContainer.find("> "+ _layerData.$id);
			_$elToRemove.remove();
		} else {
			this.parallaxElementsArray.push( new ParallaxElement(this.chapterAnimationJSON.layerDataArray[i], this.$parallaxElementsContainer) );
		}
	}
	this.parallaxElementsArrayLength = this.parallaxElementsArray.length;
};

ParallaxSection.prototype.loadChunkOfParallaxElements = function(StartIndex){
	this.parallaxElementLoadChunkEndIndex = this.parallaxElementsArrayLength < StartIndex + this.PARALLAX_ELEMENT_LOAD_CHUNK_AMOUNT ? this.parallaxElementsArrayLength : StartIndex + this.PARALLAX_ELEMENT_LOAD_CHUNK_AMOUNT;
	
	for(var i = StartIndex; i < this.parallaxElementLoadChunkEndIndex; i++){
		this.loadParallaxElement(this.parallaxElementsArray[i]);
	}
};

ParallaxSection.prototype.loadParallaxElement = function(ParallaxElement){
	var _this = this;
	
	if(ParallaxElement.isImage){
		ParallaxElement.load( function(){
			_this.onLoadParallaxElementComplete();
		});
	} else {
		this.onLoadParallaxElementComplete();
	}
};

ParallaxSection.prototype.onLoadParallaxElementComplete = function(){
	this.parallaxElementLoadCount += 1;
	this.onAsyncLoadComplete();
		
	if(this.parallaxElementLoadCount == this.parallaxElementLoadChunkEndIndex && this.parallaxElementLoadCount < this.parallaxElementsArrayLength){
		this.loadChunkOfParallaxElements(this.parallaxElementLoadCount);
	}
};

ParallaxSection.prototype.unloadParallaxElements = function(){
	for(var i = 0; i < this.parallaxElementsArrayLength; i++){
		this.parallaxElementsArray[i].unload();
		this.parallaxElementsArray[i] = null;
		delete this.parallaxElementsArray[i];
	}
	this.parallaxElementsArray = [];
	this.parallaxElementsArrayLength = 0;
};

/*

Loading secondary json data

*/

ParallaxSection.prototype.loadAllSecondaryJSON = function(){
	for(var i = 0; i < this.chapterPovEssentialData.secondaryContentPositionArrayObjLength; i++){		
		this.loadSecondaryJSON(this.chapterPovEssentialData.secondaryContentPositionArrayObj[i]);
	}
};

ParallaxSection.prototype.loadSecondaryJSON = function(CMObj){
	var _this = this;
	
	if(!CMObj.data){
		this.secondaryContentJSONLoadArray.push(new AJAXDataLoader("/api/" + CMObj.id + ".json", function(Data){
			CMObj.data = Data;
			_this.onLoadSecondaryJSONComplete();
		}));
	} else {
		this.onLoadSecondaryJSONComplete();
	}
};

ParallaxSection.prototype.onLoadSecondaryJSONComplete = function(){
	this.secondaryContentJSONLoadCount += 1;
	this.onAsyncLoadComplete();
};

ParallaxSection.prototype.abortLoadAllSecondaryJSON = function(){
	for(var i = 0; i < this.secondaryContentJSONLoadArray.length; i++){
		this.secondaryContentJSONLoadArray[i].kill();
		this.secondaryContentJSONLoadArray[i] = null;
		delete this.secondaryContentJSONLoadArray[i];
	}
	this.secondaryContentJSONLoadArray = [];
};



/*

This is called when both parallax and secondary content is loaded

*/

ParallaxSection.prototype.onAsyncLoadComplete = function(){
	this.totalAsyncLoadCount = this.parallaxElementLoadCount + this.secondaryContentJSONLoadCount;
	this.preloaderDisplay.setPercentage(Math.round((this.totalAsyncLoadCount/this.totalAsyncLoadAmount  ) * 100));
	
	if(this.totalAsyncLoadCount >= this.totalAsyncLoadAmount){
		this.preloaderDisplay.hide();
		this.onViewLoadComplete();
	}
};

//When everything in this view has completely loaded (except audio, we dont wait for that)

ParallaxSection.prototype.onViewLoadComplete = function(){
	var _this = this;
	
	this.hasBeenViewed = true;
	
	//console.log("SCROLL RANGE", this.chapterAnimationJSON.scrollRange);

	this.scrollManager = new ScrollManager({
		isAutoScrollEnabled: Modernizr.isInputTouchOnly ? false : true,
		autoScrollDurationMultiplier: 3.25 / Modernizr.timelineScalar,
		autoScrollTimeout: 45000,
		mouseTouchContainer: this.app.main.$el,
		height: this.chapterAnimationJSON.scrollRange,
		onScroll: function(ScrollTopCurrent, ScrollTopPagePercentage, ScrollTopVel) {
			_this.handleScrollPositionChange(ScrollTopCurrent, ScrollTopPagePercentage, ScrollTopVel);
		},
		onSettle: function(){
			_this.handleScrollPositionSettle();
		}
	});
			
	this.passiveParallaxInputManager = new PassiveParallaxInputManager({
		mouseTouchContainer: this.app.main.$el,
		containerHalfWidth: this.app.main.halfWidth,
		containerHalfHeight: this.app.main.halfHeight,
		containerAbsCenterTopPos: this.app.main.absCenterTopPos,
		onShift: function(EasedPassiveParallaxVector){
			_this.handlePassiveParallaxChange(EasedPassiveParallaxVector);
		},
		onSettle: function(){
			_this.handlePassiveParallaxSettle();
		}
	});
	
	this.secondaryContentScrollManager.load(this.chapterPovEssentialData, this.chapterAnimationJSON.scrollRange, this.scrollManager);

	this.chapterPovEnd.updateContent(this.chapterPovEssentialData.chapter, this.chapterPovEssentialData.pov);

	this.show();
	
	if(this.onLoadCompleteCallback){
		this.onLoadCompleteCallback();
	}
	
	this.chapterPovEnd.show();
};

ParallaxSection.prototype.checkToOpenSecondaryModal = function(ParentHashPath, ChapterPovParallaxSectionSecondaryObj, IsInitViewLoad){
	if(ChapterPovParallaxSectionSecondaryObj || this.app.infoHelpModalManager.isVisible){
		this.scrollManager.disable();
		this.passiveParallaxInputManager.disable();
		
		if(ChapterPovParallaxSectionSecondaryObj){
			this.scrollManager.setScrollTop(ChapterPovParallaxSectionSecondaryObj.sP, false);
			this.secondaryContentModalManager.load(ParentHashPath, ChapterPovParallaxSectionSecondaryObj);
			
			if(this.app.audioManager){
				this.app.audioManager.pauseCurrentSounds();
			}
		}
	} else {
		this.secondaryContentModalManager.unload();
		this.scrollManager.enable();
		this.passiveParallaxInputManager.enable();
		
		if(this.app.audioManager){
			this.app.audioManager.resumeCurrentSounds();
		}
		
		if(IsInitViewLoad){
			//If initial section load, set scroll to 1... because bug
			this.scrollManager.setScrollTop(1, true);
		}
	}
};


/*

On window resize

*/

ParallaxSection.prototype.handleWindowResize = function(){
	if(this.passiveParallaxInputManager){
		this.passiveParallaxInputManager.handleWindowResize(this.app.main.halfWidth, this.app.main.halfHeight, this.app.main.absCenterTopPos);
	}
	
	if(this.scrollManager){
		this.scrollManager.handleWindowResize();
	}
};

/*

This returns secondary content object by name.

*/

ParallaxSection.prototype.getSecondaryContentPositionObjByTypeIDComboString = function(TypeIDComboString){
	for(var i = 0; i < this.chapterPovEssentialData.secondaryContentPositionArrayObjLength; i++){
		if(this.chapterPovEssentialData.secondaryContentPositionArrayObj[i].id == TypeIDComboString){
			return this.chapterPovEssentialData.secondaryContentPositionArrayObj[i];
		}
	}
	return null;
};


/*

This handles scroll changes.

*/

ParallaxSection.prototype.handleScrollPositionChange = function(ScrollTopCurrent, ScrollTopPagePercentage, ScrollTopVel){
	this.isScrollSettled = false;
		
	if(this.app.audioManager && this.scrollManager.isEnabled){
		//console.log(ScrollTopCurrent, this.chapterAnimationJSON.scrollRange);
		this.app.audioManager.handleScrollPositionChange(ScrollTopCurrent, ScrollTopVel);
	}
	
	this.chapterPovEnd.handleScrollPositionChange(this.chapterAnimationJSON.scrollRange - ScrollTopCurrent, false);
	
	if(this.app.isLayoutDesktop){
		if(this.chapterPovEnd.isVisible){
			this.app.crownCarouselNavTray.hide();
		} else if(!this.chapterPovEnd.isVisible && !(this.app.headerNavigation.currentTray && this.app.headerNavigation.currentTray.isChapters)){
			this.app.crownCarouselNavTray.show();
		}
	} else {
		this.app.crownCarouselNavTray.show();
	}
	
	if(this.chapterPovEnd.isVisible){
		this.secondaryContentScrollManager.setToEndFrameHidden();
	} else {
		this.secondaryContentScrollManager.setToEndFrameVisible();
	}

	this.secondaryContentScrollManager.handleScrollPositionChange(ScrollTopCurrent, ScrollTopPagePercentage);
	
	this.updateTrackingPercentViewed(ScrollTopPagePercentage);
	
	for(var i = 0; i < this.parallaxElementsArrayLength; i++){
		this.parallaxElementsArray[i].handleScrollPositionChange(ScrollTopCurrent);
	}
	
	this.startParallaxElementsCSSUpdate();
};

ParallaxSection.prototype.updateTrackingPercentViewed = function(ScrollTopEasedPagePercentage){
	if(.1 <= ScrollTopEasedPagePercentage && ScrollTopEasedPagePercentage < .25 && !this.is10PercentViewed){
		this.is10PercentViewed = true;
		TrackGA(["_trackEvent", "NGC: Killing Jesus", "POV " + window.location.hash + " Scroll Percentage", "10%"]);
	} else if(.25 <= ScrollTopEasedPagePercentage && ScrollTopEasedPagePercentage < .5 && !this.is25PercentViewed){
		this.is25PercentViewed = true;
		TrackGA(["_trackEvent", "NGC: Killing Jesus", "POV " + window.location.hash + " Scroll Percentage", "25%"]);
	} else if(.5 <= ScrollTopEasedPagePercentage && ScrollTopEasedPagePercentage < .75 && !this.is50PercentViewed){
		this.is50PercentViewed = true;
		TrackGA(["_trackEvent", "NGC: Killing Jesus", "POV " + window.location.hash + " Scroll Percentage", "50%"]);
	} else if(.75 <= ScrollTopEasedPagePercentage && ScrollTopEasedPagePercentage < .9 && !this.is75PercentViewed){
		this.is75PercentViewed = true;
		TrackGA(["_trackEvent", "NGC: Killing Jesus", "POV " + window.location.hash + " Scroll Percentage", "75%"]);
	} else if(.9 < ScrollTopEasedPagePercentage && !this.is90PercentViewed) {
		this.is90PercentViewed = true;
		TrackGA(["_trackEvent", "NGC: Killing Jesus", "POV " + window.location.hash + " Scroll Percentage", "90%"]);
	}
};

ParallaxSection.prototype.handleScrollPositionSettle = function(){
	this.isScrollSettled = true;
	this.checkToCancelParallaxElementsCSSUpdate();
};


/*

This handles passive parallax changes. Tilting on devices and mouse movement on desktops.

*/

ParallaxSection.prototype.handlePassiveParallaxChange = function(EasedPassiveParallaxVector){
	this.isPassiveParallaxSettled = false;
	for(var i = 0; i < this.parallaxElementsArrayLength; i++){
		this.parallaxElementsArray[i].handlePassiveParallaxChange(EasedPassiveParallaxVector);
	}	
	this.startParallaxElementsCSSUpdate();
};

ParallaxSection.prototype.handlePassiveParallaxSettle = function(){
	this.isPassiveParallaxSettled = true;
	this.checkToCancelParallaxElementsCSSUpdate();
};


/*

This is an update look that updates CSS. This is so passive parallax and scroll CSS updates dont double up.

*/

ParallaxSection.prototype.startParallaxElementsCSSUpdate = function(){
	var _this = this;
	if(!this.isParallaxElementsCSSUpdating){		
		this.isParallaxElementsCSSUpdating = true;
		requestAnimationFrame(function(){
			_this.updateParallaxElementsCSS();
		});
	}
};

ParallaxSection.prototype.checkToCancelParallaxElementsCSSUpdate = function(){
	if(this.isPassiveParallaxSettled && this.isScrollSettled){
		this.cancelParallaxElementsCSSUpdate();
	}
};

ParallaxSection.prototype.cancelParallaxElementsCSSUpdate = function(){
	var _this = this;
	this.isParallaxElementsCSSUpdating = false;
	cancelAnimationFrame(function(){
		_this.updateParallaxElementsCSS();
	});
};

ParallaxSection.prototype.updateParallaxElementsCSS = function(){
	var _this = this;

	if(this.isParallaxElementsCSSUpdating){
		for(var i = 0; i < this.parallaxElementsArrayLength; i++){
			this.parallaxElementsArray[i].updateCSS();
		}
	
		requestAnimationFrame(function(){
			_this.updateParallaxElementsCSS();
		});
	}
};