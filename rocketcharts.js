/**
 * Base class, keeps track of our panels, settings, metrics and data, also exposes indicator enum
 * @alias				rocketcharts
 * @return	{bool}
 * @method
 */
function rocketchart() {
	this.panels = [];
	this.panelOverlays = [];
	this.data = [];
	this.element;
	this.indicators = [{name: 'Simple Moving Average', id: 'simplemovingaverage'},
					   {name: 'Weighted Moving Average', id: 'weightedmovingaverage'},
					   {name: 'Moving Average Convergance/Divergance', id: 'movingaverageconvergencedivergence'},
					   {name: 'Parabolic SAR', id: 'parabolicsar'},
					   {name: 'Stochastic Oscillator Fast', id: 'stochasticfast'}];
					   
	this.priceAxisWidth = 75;
					   
	var settings = new Object();
	settings.minimumPanelHeight = 200;
	settings.defaultUpColor = "#00EAFF";
	settings.defaultDownColor = "#005F6B";
	settings.backgroundColor = "#343838";
	this.settings = settings;
	
	var view = new Object();
	view.horizontalPixelsPerPoint = 0;
	view.halfHorizontalPixelsPerPoint = 0;
	view.startingPoint = 0;
	view.endingPoint = 0;
	this.view = view;
	
	this.initComplete = function() {};
	
	return true;
}

/**
 * Appends markup to passed element, hooks into mouse-events, sets up our raster text, other bootup stuff
 * @alias				rocketcharts.init(element, settings)
 * @param	{string}	element		The string identifier of the html element to attach to
 * @param	{Object}	settings	Holds any number of settings
 * @return	{void}
 * @method
 */
rocketchart.prototype.init = function(element, settings){
	
	// store global variable after looking it up with jquery
	this.element = $(element);
	this.width = this.element.width();
	
	this.element.append("<div id=\"panels\" style=\"height: 100%; width: 100%; position: relative;\"></div>");
	var panelsElement = $("#panels");
	
	panelsElement.css("overflow", "auto");
	panelsElement.css("margin", "0px");
	panelsElement.css("padding", "0px");
	
	
	
	$(window).resize(function() {
		rocketcharts.resize(rocketcharts.element.context.clientWidth, rocketcharts.element.context.clientHeight);
		rocketcharts.draw();
	});
	
	// Keeping this for future implementation of drag 'handles' via JQueryUI
	panelsElement.bind( "resize", function(event, ui) {
		rocketcharts.resize(ui.size.width, ui.size.height);
		rocketcharts.draw();
	});
	panelsElement.bind("mousedown", function(event, ui) {
		$(this).bind( "mousemove", function(event, ui) {
			
			var relativeX = event.pageX - this.offsetLeft;
		    var relativeY = event.pageY - this.offsetTop;
			
			rocketcharts.headsUpDisplay(relativeX, relativeY);
			//rocketcharts.draw();
		});
		this.style.cursor = 'crosshair';
		
		var relativeX = event.pageX - this.offsetLeft;
	    var relativeY = event.pageY - this.offsetTop;
		
		rocketcharts.headsUpDisplay(relativeX, relativeY);
		//rocketcharts.draw();
		return false; // Prevents browser from changing cursor to 'I-Beam', thinking we are trying to select text
	});
	panelsElement.bind("mouseup", function(event, ui) {
		$(this).unbind( "mousemove" );
		this.style.cursor = 'default';
		rocketcharts.mouseDown = false;
		rocketcharts.HUD = false;
		//rocketcharts.draw();
		rocketcharts.clearHUD();
	});
	
	// If a settings object was passed with only the property 'resizable' set, just that
	// parameter should be updated in the global object
	if (settings != undefined) {
		if (settings.defaultUpColor != undefined) {
			this.settings.defaultUpColor = settings.defaultUpColor;
		}
		if (settings.defaultDownColor != undefined) {
			this.settings.defaultDownColor = settings.defaultDownColor;
		}
		if (settings.backgroundColor != undefined) {
			this.settings.backgroundColor = settings.backgroundColor;
		}
		if (settings.customUI != undefined) {
			this.settings.customUI = settings.customUI;
		}
	}
	
	this.settings.defaultUpColor = hexToRgb(this.settings.defaultUpColor);
	this.settings.defaultDownColor = hexToRgb(this.settings.defaultDownColor);
	this.settings.backgroundColor = hexToRgb(this.settings.backgroundColor);
	
	if (this.settings.resizable)
		this.element.resizable();
		
	if ((this.settings.customUI == false) || (this.settings.customUI == undefined)) {
		// Add our windows for chart management:
		GenerateDialogs(this.element, this.indicators);
	}
	
	this.element.append("<div style=\"height: 15px; width: 100%; background-color: " + rgbToHex(this.settings.backgroundColor.r, this.settings.backgroundColor.g, this.settings.backgroundColor.b) + ";\">" +
							"<canvas id=\"dateAxisCanvas\" width=\"" + this.width + "\" height=\"15\"></canvas>" +
						"</div>");
	
	this.dateAxisCanvas = document.getElementById("dateAxisCanvas");
	
	this.element.append("<div id=\"zoomSlider\" style=\"height: 15px; width: 100%; background-color: " + rgbToHex(this.settings.backgroundColor.r, this.settings.backgroundColor.g, this.settings.backgroundColor.b) + ";\">" + "</div>");
	
	// Experimental: Raster Text
	/*
	this.element.append("<canvas id=\"bufferCanvas\" width=\"600\" height=\"10\" style=\"display: none;\"></canvas>");
	var bufferCanvas = document.getElementById("bufferCanvas");
	var bufferContext = bufferCanvas.getContext("2d");
	
	var fontImage = new Image();
	fontImage.onload = function(){
		
		bufferContext.drawImage(fontImage, 0, 0, 566, 7);
		rocketcharts.fontPoints = new Array();
		
		var w = 566;
		var fontPixelArray = bufferContext.getImageData(0, 0, w, 7);
		var fontPixelData = fontPixelArray.data;
		var total = -1;
		var x = 0;
		var y = 0;
		var index = -1;
		var arrayPointer;
		
		for (var i=0; i < 95; i++) {
			rocketcharts.fontPoints[i] = new Array();
		}
		
		for (var i=0; i < fontPixelData.length; i++) {
			// Add up the R, G, B values
			total = fontPixelData[i] + fontPixelData[i+1] + fontPixelData[i+2];
			
			// If the total = 0 it's a black pixel, if not, we need to record it
			if (total > 0) {
				x=i/4%w;
				y=(i/4-x)/w;
				index = Math.floor(x/6);
				x = x - (index * 6);
				
				arrayPointer = rocketcharts.fontPoints[index];
				
				rocketcharts.fontPoints[index][arrayPointer.length] = {x: x, y: y};
			}
			
			i += 3;
			
		}
		
		$(rocketcharts).trigger('initComplete');
		
	};

	fontImage.src = "bitmapfont.png";
	*/
	
	rocketcharts.fontPoints = [[{x:3, y:0}, {x:3, y:1}, {x:3, y:2}, {x:3, y:3}, {x:3, y:5}, {x:3, y:6}], 
			[{x:2, y:0}, {x:4, y:0}, {x:2, y:1}, {x:4, y:1}], 
			[{x:2, y:1}, {x:4, y:1}, {x:1, y:2}, {x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:5, y:2}, {x:2, y:3}, {x:4, y:3}, {x:1, y:4}, {x:2, y:4}, {x:3, y:4}, {x:4, y:4}, {x:5, y:4}, {x:2, y:5}, {x:4, y:5}], 
			[{x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:1, y:1}, {x:3, y:1}, {x:5, y:1}, {x:1, y:2}, {x:3, y:2}, {x:2, y:3}, {x:3, y:3}, {x:4, y:3}, {x:3, y:4}, {x:5, y:4}, {x:1, y:5}, {x:3, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:1, y:0}, {x:5, y:0}, {x:1, y:1}, {x:4, y:1}, {x:4, y:2}, {x:3, y:3}, {x:2, y:4}, {x:2, y:5}, {x:5, y:5}, {x:1, y:6}, {x:5, y:6}], 
			[{x:2, y:0}, {x:3, y:0}, {x:5, y:0}, {x:1, y:1}, {x:5, y:1}, {x:2, y:2}, {x:3, y:2}, {x:5, y:2}, {x:1, y:3}, {x:4, y:3}, {x:1, y:4}, {x:4, y:4}, {x:1, y:5}, {x:4, y:5}, {x:2, y:6}, {x:3, y:6}, {x:5, y:6}], 
			[{x:2, y:0}, {x:2, y:1}], 
			[{x:3, y:0}, {x:4, y:0}, {x:5, y:0}, {x:2, y:1}, {x:1, y:2}, {x:1, y:3}, {x:1, y:4}, {x:2, y:5}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:1}, {x:5, y:2}, {x:5, y:3}, {x:5, y:4}, {x:4, y:5}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}], 
			[{x:3, y:0}, {x:1, y:1}, {x:3, y:1}, {x:5, y:1}, {x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:3, y:3}, {x:2, y:4}, {x:3, y:4}, {x:4, y:4}, {x:1, y:5}, {x:3, y:5}, {x:5, y:5}, {x:3, y:6}], 
			[{x:3, y:1}, {x:3, y:2}, {x:1, y:3}, {x:2, y:3}, {x:3, y:3}, {x:4, y:3}, {x:5, y:3}, {x:3, y:4}, {x:3, y:5}], 
			[{x:3, y:5}, {x:2, y:6}], 
			[{x:1, y:3}, {x:2, y:3}, {x:3, y:3}, {x:4, y:3}, {x:5, y:3}], 
			[{x:3, y:5}, {x:3, y:6}], 
			[{x:5, y:0}, {x:4, y:1}, {x:4, y:2}, {x:3, y:3}, {x:2, y:4}, {x:2, y:5}, {x:1, y:6}], 
			[{x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:3, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:3, y:0}, {x:2, y:1}, {x:3, y:1}, {x:3, y:2}, {x:3, y:3}, {x:3, y:4}, {x:3, y:5}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}], 
			[{x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:1, y:1}, {x:5, y:1}, {x:5, y:2}, {x:4, y:3}, {x:3, y:4}, {x:2, y:5}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:5, y:1}, {x:5, y:2}, {x:3, y:3}, {x:4, y:3}, {x:5, y:4}, {x:5, y:5}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:4, y:0}, {x:1, y:1}, {x:4, y:1}, {x:1, y:2}, {x:4, y:2}, {x:1, y:3}, {x:2, y:3}, {x:3, y:3}, {x:4, y:3}, {x:5, y:3}, {x:4, y:4}, {x:4, y:5}, {x:4, y:6}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:5, y:0}, {x:1, y:1}, {x:1, y:2}, {x:1, y:3}, {x:2, y:3}, {x:3, y:3}, {x:4, y:3}, {x:5, y:4}, {x:5, y:5}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:1, y:1}, {x:1, y:2}, {x:1, y:3}, {x:2, y:3}, {x:3, y:3}, {x:4, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:5, y:0}, {x:5, y:1}, {x:5, y:2}, {x:5, y:3}, {x:5, y:4}, {x:5, y:5}, {x:5, y:6}], 
			[{x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:5, y:2}, {x:2, y:3}, {x:3, y:3}, {x:4, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:2, y:3}, {x:3, y:3}, {x:4, y:3}, {x:5, y:3}, {x:5, y:4}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:2, y:2}, {x:2, y:3}, {x:2, y:5}, {x:2, y:6}], 
			[{x:3, y:2}, {x:3, y:3}, {x:3, y:5}, {x:2, y:6}], 
			[{x:4, y:0}, {x:5, y:0}, {x:3, y:1}, {x:2, y:2}, {x:1, y:3}, {x:2, y:4}, {x:3, y:5}, {x:4, y:6}, {x:5, y:6}], 
			[{x:1, y:2}, {x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:5, y:2}, {x:1, y:4}, {x:2, y:4}, {x:3, y:4}, {x:4, y:4}, {x:5, y:4}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:1}, {x:4, y:2}, {x:5, y:3}, {x:4, y:4}, {x:3, y:5}, {x:1, y:6}, {x:2, y:6}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:5, y:0}, {x:5, y:1}, {x:5, y:2}, {x:3, y:3}, {x:4, y:3}, {x:3, y:5}, {x:3, y:6}], 
			[{x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:3, y:3}, {x:5, y:3}, {x:1, y:4}, {x:3, y:4}, {x:4, y:4}, {x:5, y:4}, {x:1, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:2, y:3}, {x:3, y:3}, {x:4, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:1, y:6}, {x:5, y:6}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:2, y:3}, {x:3, y:3}, {x:4, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:1, y:3}, {x:1, y:4}, {x:1, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:5, y:0}, {x:1, y:1}, {x:1, y:2}, {x:1, y:3}, {x:2, y:3}, {x:3, y:3}, {x:1, y:4}, {x:1, y:5}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:5, y:0}, {x:1, y:1}, {x:1, y:2}, {x:1, y:3}, {x:2, y:3}, {x:3, y:3}, {x:1, y:4}, {x:1, y:5}, {x:1, y:6}], 
			[{x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:1, y:3}, {x:3, y:3}, {x:4, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:1, y:0}, {x:5, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:2, y:3}, {x:3, y:3}, {x:4, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:1, y:6}, {x:5, y:6}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:5, y:0}, {x:3, y:1}, {x:3, y:2}, {x:3, y:3}, {x:3, y:4}, {x:3, y:5}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:5, y:0}, {x:5, y:1}, {x:5, y:2}, {x:5, y:3}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:1, y:0}, {x:5, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:4, y:2}, {x:1, y:3}, {x:2, y:3}, {x:3, y:3}, {x:1, y:4}, {x:4, y:4}, {x:1, y:5}, {x:5, y:5}, {x:1, y:6}, {x:5, y:6}], 
			[{x:1, y:0}, {x:1, y:1}, {x:1, y:2}, {x:1, y:3}, {x:1, y:4}, {x:1, y:5}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}], 
			[{x:1, y:0}, {x:5, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:2, y:2}, {x:4, y:2}, {x:5, y:2}, {x:1, y:3}, {x:3, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:1, y:6}, {x:5, y:6}], 
			[{x:1, y:0}, {x:5, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:2, y:2}, {x:5, y:2}, {x:1, y:3}, {x:3, y:3}, {x:5, y:3}, {x:1, y:4}, {x:4, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:1, y:6}, {x:5, y:6}], 
			[{x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:2, y:3}, {x:3, y:3}, {x:4, y:3}, {x:1, y:4}, {x:1, y:5}, {x:1, y:6}], 
			[{x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:3, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:2, y:3}, {x:3, y:3}, {x:4, y:3}, {x:1, y:4}, {x:3, y:4}, {x:1, y:5}, {x:4, y:5}, {x:1, y:6}, {x:5, y:6}], 
			[{x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:2, y:3}, {x:3, y:3}, {x:4, y:3}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:5, y:0}, {x:3, y:1}, {x:3, y:2}, {x:3, y:3}, {x:3, y:4}, {x:3, y:5}, {x:3, y:6}], 
			[{x:1, y:0}, {x:5, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:1, y:0}, {x:5, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:2, y:5}, {x:4, y:5}, {x:3, y:6}], 
			[{x:1, y:0}, {x:5, y:0}, {x:1, y:1}, {x:5, y:1}, {x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:3, y:3}, {x:5, y:3}, {x:1, y:4}, {x:3, y:4}, {x:5, y:4}, {x:1, y:5}, {x:3, y:5}, {x:5, y:5}, {x:2, y:6}, {x:4, y:6}], 
			[{x:1, y:0}, {x:5, y:0}, {x:1, y:1}, {x:5, y:1}, {x:2, y:2}, {x:4, y:2}, {x:3, y:3}, {x:2, y:4}, {x:4, y:4}, {x:1, y:5}, {x:5, y:5}, {x:1, y:6}, {x:5, y:6}], 
			[{x:1, y:0}, {x:5, y:0}, {x:1, y:1}, {x:5, y:1}, {x:2, y:2}, {x:4, y:2}, {x:3, y:3}, {x:3, y:4}, {x:3, y:5}, {x:3, y:6}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:5, y:0}, {x:5, y:1}, {x:4, y:2}, {x:3, y:3}, {x:2, y:4}, {x:1, y:5}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}], 
			[{x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:2, y:1}, {x:2, y:2}, {x:2, y:3}, {x:2, y:4}, {x:2, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:1, y:0}, {x:2, y:1}, {x:2, y:2}, {x:3, y:3}, {x:4, y:4}, {x:4, y:5}, {x:5, y:6}], 
			[{x:2, y:0}, {x:3, y:0}, {x:4, y:0}, {x:4, y:1}, {x:4, y:2}, {x:4, y:3}, {x:4, y:4}, {x:4, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:3, y:0}, {x:2, y:1}, {x:4, y:1}], 
			[{x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}], 
			[{x:4, y:0}, {x:3, y:1}, {x:0, y:6}, {x:1, y:6}], 
			[{x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:5, y:3}, {x:2, y:4}, {x:3, y:4}, {x:4, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}], 
			[{x:1, y:0}, {x:1, y:1}, {x:1, y:2}, {x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:1, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:1, y:3}, {x:5, y:3}, {x:1, y:4}, {x:1, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:5, y:0}, {x:5, y:1}, {x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:5, y:2}, {x:1, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}], 
			[{x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:1, y:3}, {x:5, y:3}, {x:1, y:4}, {x:2, y:4}, {x:3, y:4}, {x:4, y:4}, {x:5, y:4}, {x:1, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}], 
			[{x:3, y:0}, {x:4, y:0}, {x:5, y:0}, {x:2, y:1}, {x:1, y:2}, {x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:2, y:3}, {x:2, y:4}, {x:2, y:5}, {x:2, y:6}], 
			[{x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:1, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}], 
			[{x:1, y:0}, {x:1, y:1}, {x:1, y:2}, {x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:1, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:1, y:6}, {x:5, y:6}], 
			[{x:3, y:0}, {x:4, y:0}, {x:1, y:2}, {x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:5, y:2}, {x:3, y:3}, {x:3, y:4}, {x:3, y:5}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}], 
			[{x:3, y:0}, {x:4, y:0}, {x:1, y:2}, {x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:5, y:2}, {x:5, y:3}, {x:5, y:4}, {x:5, y:5}, {x:5, y:6}], 
			[{x:1, y:0}, {x:1, y:1}, {x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:4, y:3}, {x:1, y:4}, {x:2, y:4}, {x:3, y:4}, {x:1, y:5}, {x:4, y:5}, {x:1, y:6}, {x:5, y:6}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:0}, {x:3, y:1}, {x:3, y:2}, {x:3, y:3}, {x:3, y:4}, {x:3, y:5}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}], 
			[{x:1, y:2}, {x:2, y:2}, {x:4, y:2}, {x:1, y:3}, {x:3, y:3}, {x:5, y:3}, {x:1, y:4}, {x:3, y:4}, {x:5, y:4}, {x:1, y:5}, {x:3, y:5}, {x:5, y:5}, {x:1, y:6}, {x:3, y:6}, {x:5, y:6}], 
			[{x:1, y:2}, {x:3, y:2}, {x:4, y:2}, {x:1, y:3}, {x:2, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:1, y:6}, {x:5, y:6}], 
			[{x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:1, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:1, y:2}, {x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:1, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:5, y:2}, {x:1, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}], 
			[{x:1, y:2}, {x:3, y:2}, {x:4, y:2}, {x:5, y:2}, {x:1, y:3}, {x:2, y:3}, {x:1, y:4}, {x:1, y:5}, {x:1, y:6}], 
			[{x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:5, y:2}, {x:1, y:3}, {x:2, y:4}, {x:3, y:4}, {x:4, y:4}, {x:5, y:5}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:3, y:0}, {x:3, y:1}, {x:1, y:2}, {x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:5, y:2}, {x:3, y:3}, {x:3, y:4}, {x:3, y:5}, {x:3, y:6}], 
			[{x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}], 
			[{x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:2, y:5}, {x:4, y:5}, {x:3, y:6}], 
			[{x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:3, y:3}, {x:5, y:3}, {x:1, y:4}, {x:3, y:4}, {x:5, y:4}, {x:1, y:5}, {x:3, y:5}, {x:5, y:5}, {x:2, y:6}, {x:4, y:6}], 
			[{x:1, y:2}, {x:5, y:2}, {x:2, y:3}, {x:4, y:3}, {x:3, y:4}, {x:2, y:5}, {x:4, y:5}, {x:1, y:6}, {x:5, y:6}], 
			[{x:1, y:2}, {x:5, y:2}, {x:1, y:3}, {x:5, y:3}, {x:1, y:4}, {x:5, y:4}, {x:1, y:5}, {x:5, y:5}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}], 
			[{x:1, y:2}, {x:2, y:2}, {x:3, y:2}, {x:4, y:2}, {x:5, y:2}, {x:4, y:3}, {x:3, y:4}, {x:2, y:5}, {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6}], 
			[{x:4, y:0}, {x:5, y:0}, {x:3, y:1}, {x:2, y:2}, {x:1, y:3}, {x:2, y:3}, {x:2, y:4}, {x:3, y:5}, {x:4, y:6}, {x:5, y:6}], 
			[{x:3, y:0}, {x:3, y:1}, {x:3, y:2}, {x:3, y:3}, {x:3, y:4}, {x:3, y:5}, {x:3, y:6}], 
			[{x:1, y:0}, {x:2, y:0}, {x:3, y:1}, {x:4, y:2}, {x:4, y:3}, {x:5, y:3}, {x:4, y:4}, {x:3, y:5}, {x:1, y:6}, {x:2, y:6}], 
			[{x:2, y:3}, {x:5, y:3}, {x:1, y:4}, {x:3, y:4}, {x:4, y:4}], 
			[]];
};

/**
 * Handles element resizing
 * @alias				rocketcharts.resize(w, h)
 * @param	{int}		w	Width
 * @param	{int}		h	Height
 * @return	{void}
 * @method
 */
rocketchart.prototype.resize = function(w, h){
	
	/*
	 * The code relating to calcHeight was for dynamically resizing the height of the panels
	 * when the end-user resized them via JQueryUI - putting this on hold for the moment
	 */
	
	// var calcHeight = 0;
	
	this.width = w;
	this.dateAxisCanvas.setAttribute("width", w);
	var simpleHeight = Math.floor(h / this.panels.length) - 1;
	
	for (var i=0; i < this.panels.length; i++) {
		
		/*
		if (this.panels[i]._userHeight <= 1){
			calcHeight = this.panels[i]._userHeight * h;
		} else {
			calcHeight = this.panels[i]._userHeight;
		}
		*/
		
		// update the width and height of the canvas
		this.panels[i]._canvas.setAttribute("width", w - 1);
		this.panels[i]._canvas.setAttribute("height", simpleHeight);
		this.panels[i]._canvas.style.top = simpleHeight * i;
		
		this.panelOverlays[i].setAttribute("width", w - 1);
		this.panelOverlays[i].setAttribute("height", simpleHeight);
		this.panelOverlays[i].style.top = simpleHeight * i;
		
	}
}

/**
 * Calculates point for HUD, sets draw flags based on mouse position
 * @alias				rocketcharts.headsUpDisplay(x, y)
 * @param	{int}		x		
 * @param	{int}		y
 * @return	{void}
 * @method
 */
rocketchart.prototype.headsUpDisplay = function(x, y){
	var dateAxisWidth = this.width - this.priceAxisWidth;
	
	var displayedPoints = rocketcharts.view.endingPoint - rocketcharts.view.startingPoint; 
	var horizontalPixelsPerPoint = rocketcharts.view.horizontalPixelsPerPoint;
	var halfhorizSpacing = rocketcharts.view.halfHorizontalPixelsPerPoint;
	
	var point = -1;
	
	if (x > dateAxisWidth) {
		// flag the removal of info box
		return;
	} else {
		point = Math.floor(x / horizontalPixelsPerPoint);
	}
	
	var pointX = (point * horizontalPixelsPerPoint) + halfhorizSpacing;
	point = point + rocketcharts.view.startingPoint;
	
	var height = 0;
	var width = 0;
	
	var bottom = 0;
	var calcY = 0;
	
	var legendLines = [];
	
	for (var i=0; i < this.panelOverlays.length; i++) {
		
		// grab the datacontext of the canvas
		var context = this.panelOverlays[i].getContext("2d");
		
		// read the height of the canvas
		height = parseInt(this.panelOverlays[i].getAttribute("height"));
		width = parseInt(this.panelOverlays[i].getAttribute("width"));
		
		// create a new pixel array
		var imageData = context.createImageData(width, height);
		
		line(imageData, pointX, 0, pointX, height, 255, 255, 255, 255, 1);
		
		bottom = this.panelOverlays[i].offsetTop + this.panelOverlays[i].height;
		
		if ((y > this.panelOverlays[i].offsetTop) && (y < bottom) ) {
			calcY = y - this.panelOverlays[i].offsetTop;
			line(imageData, 0, calcY, width, calcY, 255, 255, 255, 255, 1);
		}
		
		// HUD:
		for (var s=0; s < this.panels[i]._series.length; s++) {
			legendLines[legendLines.length] = this.panels[i]._series[s].title + " [OPEN]: " + formatRate(this.panels[i]._series[s].data[point]["open"]);
			legendLines[legendLines.length] = this.panels[i]._series[s].title + " [HIGH]: " + formatRate(this.panels[i]._series[s].data[point]["high"]);
			legendLines[legendLines.length] = this.panels[i]._series[s].title + " [LOW]: " + formatRate(this.panels[i]._series[s].data[point]["low"]);
			legendLines[legendLines.length] = this.panels[i]._series[s].title + " [CLOSE]: " + formatRate(this.panels[i]._series[s].data[point]["close"]);
			legendLines[legendLines.length] = this.panels[i]._series[s].title + " [DATE]: " + this.panels[i]._series[s].data[point]["date"];
		}

		for (var s=0; s < this.panels[i]._indicators.length; s++) {
			
			for (var j=0; j < this.panels[i]._indicators[s]._indicator._series.length; j++) {
				legendLines[legendLines.length] = this.panels[i]._indicators[s]._indicator._series[j].title + ": " + formatRate(this.panels[i]._indicators[s]._indicator._data[j][point]);
			}
		};
		
		boxBlend(imageData, 10, 10, 210, (legendLines.length * 15) + 10, 25, 25, 25, 60);// 0xFF);
		for (var s=0; s < legendLines.length; s++) {
			rasterText(imageData, legendLines[s] , 12, 15 * (s+1));
		}
		
		
		// copy the image data back onto the canvas
		context.putImageData(imageData, 0, 0);
		
		legendLines = [];
	};
	
}

rocketchart.prototype.clearHUD = function(){
	
	for (var i=0; i < this.panelOverlays.length; i++) {

		// This clears the canvas:
		var context = this.panelOverlays[i].getContext("2d");
		context.clearRect(0,0,this.panelOverlays[i].width,this.panelOverlays[i].height);
		
		// Hacky way, slower except in earlier canvas implementations:
		//this.panelOverlays[i].setAttribute("width", this.panelOverlays[i].width);
		
	}
	
}

/**
 * Adds a canvas to our root element and tracks it in our panels array
 * @alias				rocketcharts.addPanel()
 * @return	{int}		The ID of the panel that was added
 * @method
 */
rocketchart.prototype.addPanel = function(){
	
	var calcHeight = 0;
	var calcY = 0;
	
	var panelID = this.panels.length;
	var panelHeightPercent = 1 / (panelID + 1);
	var actualHeight = panelHeightPercent * this.element.height();
	
	if (actualHeight < this.settings.minimumPanelHeight) {
		actualHeight = this.settings.minimumPanelHeight;
	}
	
	var panelsElement = $("#panels");
	
	for (var i=0; i < this.panels.length; i++) {
		
		/*
		if (this.panels[i]._userHeight <= 1){
			calcHeight = this.panels[i]._userHeight * h;
		} else {
			calcHeight = this.panels[i]._userHeight;
		}
		
		if (calcHeight < this.settings.minimumPanelHeight) {
			calcHeight = this.settings.minimumPanelHeight;
		}
		*/
			
		// update the width and height of the canvas
		this.panels[i]._canvas.setAttribute("height", actualHeight);
		calcY += actualHeight;
		
	}
	
	// this.element.append
	panelsElement.append('<canvas style="padding: 0px; margin: 0px; z-index: 0; position: absolute; left: 0px; top: ' + calcY + 'px;" id="panel' + panelID + '" width="' + (this.element.width() - 20) + '" height="' + actualHeight + '">rocketchart panel</canvas>');
	this.panels[panelID] = new rocketpanel(document.getElementById("panel" + panelID), actualHeight);
	
	panelsElement.append('<canvas style="padding: 0px; margin: 0px; z-index: 1; position: absolute; left: 0px; top: ' + calcY + 'px;" id="panelOverlay' + panelID + '" width="' + (this.element.width() - 20) + '" height="' + actualHeight + '">rocketchart panel</canvas>');
	this.panelOverlays[panelID] = document.getElementById("panelOverlay" + panelID);
	
	return panelID;
}

/**
 * Adds a new primary series to the chart
 * @alias				rocketcharts.addSeries(title, data, type, panel)
 * @param	{string}	title		The string identifier for this series		
 * @param	{Array}		data		Array of {Object}s with the properties: Open, High, Low, Close, Date
 * @param	{int}		type		Enum identifier describing chart type	
 * @param	{Object}	style		Object containing colors, line thickness, transparency, etc...	
 * @param	{int}		panel		ID of the panel to add the series to
 * @return	{void}
 * @method
 */
rocketchart.prototype.addSeries = function(title, data, type, style, panel){

	var panelID = -1;
	var panelHeight = -1;

	if (panel == undefined){
		panelID = this.addPanel();
	} else {
		panelID = panel;
	}
	
	if (data == undefined){
		data = GeneratePriceHistory();
	} else {
		// TODO: Verify the integrity of the data before blindly accepting it. 
	}
	
	if (type == undefined) {
		type = 0; // Default to candlesticks
	}
	
	// Keep track of all series data in a root array for quick lookups
	this.data[this.data.length] = {title: title, data: data};
	this.panels[panelID].addSeries(new rocketseries(this.data[this.data.length - 1].data, type, title, style));
	
	rocketcharts.view.startingPoint = Math.round(data.length / 2);
	rocketcharts.view.endingPoint = data.length;
	
	$("#zoomSlider").slider({
		range: true,
		min: 0,
		max: data.length,
		values: [ Math.round(data.length / 2), data.length ],
		slide: function( event, ui ) {
			rocketcharts.view.startingPoint = ui.values[ 0 ];
			rocketcharts.view.endingPoint = ui.values[ 1 ];
			rocketcharts.draw();
		}
	});
	
	this.draw();
};

/**
 * Adds a new indicator to the chart
 * @alias				rocketcharts.addIndicator(id, params, series, panel)
 * @param	{string}	id		The string identifier of the indicator to add, i.e. 'simplemovingaverage'
 * @param	{Array}		params	The array of user-supplied parameters specific to the indicator
 * @param	{int}		series	The id of the series' data we want to calculate this indicator from
 * @param	{int}		panel	the id of the panel to add this series to, if undefined, we create a new panel
 * @return	{void}
 * @method
 */
rocketchart.prototype.addIndicator = function(id, params, series, panel){

	var panelID = -1;
	
	if ((panel == undefined) || (panel == -1)){
		panelID = this.addPanel();
	} else {
		panelID = panel;
	}
	
	if (series == undefined) {
		series = 0;
	}
	
	this.panels[panelID].addIndicator(new rocketindicator(id, this.data[series].data, params));
	this.draw();
};


/**
 * Beginning of a chain of function calls to draw chart - creates image data for each canvas
 * we are tracking, in turn passes that imageData to each panel in our array for drawing 
 * @alias				rocketcharts.draw()
 * @return	{void}
 * @method
 */
rocketchart.prototype.draw = function(){
	
	var height = 0;
	
	// For now displayedPoints = all ticks, in the future whatever zoom or view we have set
	var displayedPoints = rocketcharts.view.endingPoint - rocketcharts.view.startingPoint; //this.data[0].data.length; 
	var dateAxisWidth = this.width - this.priceAxisWidth;
	rocketcharts.view.horizontalPixelsPerPoint = dateAxisWidth / displayedPoints;
	rocketcharts.view.halfHorizontalPixelsPerPoint = Math.round(rocketcharts.view.horizontalPixelsPerPoint / 2.0) - 1;
	
	// Draw panels:
	for (var i=0; i < this.panels.length; i++) {
		
		// grab the datacontext of the canvas
		var context = this.panels[i]._canvas.getContext("2d");
		
		// read the height of the canvas
		height = parseInt(this.panels[i]._canvas.getAttribute("height"));
		
		console.log("draw called, width: " + this.width + " height: " + height);
		
		// create a new pixel array
		var imageData = context.createImageData(this.width, height);
		
		this.panels[i].draw(imageData, this.width - this.priceAxisWidth);
		
		// copy the image data back onto the canvas
		context.putImageData(imageData, 0, 0);
	};
	
	// Draw date axis:
	var context = this.dateAxisCanvas.getContext("2d");
	var imageData = context.createImageData(this.width, 15);
	
	
	
	//var step = Math.floor(displayedPoints / Math.floor(dateAxisWidth / 150));
	//var minorStep = Math.floor(step / 10); //Math.ceil(displayedPoints / (dateAxisWidth / 5));
	
	// Take the last date string, calculate it's width in pixels
	// TODO: Perhaps calculate the average length to avoid one-off long or short strings?
	var averageDateSpace = (this.data[0].data[displayedPoints - 1].date.length * 6) + 20;
	
	var minorStep = 4;
	var majorStep = Math.ceil(averageDateSpace / (minorStep * rocketcharts.view.horizontalPixelsPerPoint));
	//var majorStep = Math.ceil(150 / (minorStep * horizontalPixelsPerPoint));
	
	var k = 0;
	var tickCount = 0;
	
	for (var i=1; i < displayedPoints; i++) {
		
		if (i % minorStep == 0) {
			k = i * rocketcharts.view.horizontalPixelsPerPoint;
			line(imageData, k, 0, k, 1, 100, 100, 100, 0xFF);
			tickCount++;
			
			if (tickCount % majorStep == 0) {
				//k = i * horizontalPixelsPerPoint;
				line(imageData, k, 0, k, 3, 255,255,255, 0xFF);
				//rasterText(imageData, this.data[0].data[i].date, k - 60, 6);
				rasterText(imageData, this.data[0].data[i].date, k - (averageDateSpace / 2) + 10, 6);
			}
		}
		
		
		
	};
	
	context.putImageData(imageData, 0, 0);

};

var rocketcharts = new rocketchart();

/**
 * Base class for our series
 * @alias				new rocketseries(data, type, title)
 * @param	{Array}		data	Array of OHLC data
 * @param	{string}	type	The string identifier of the series type enum
 * @param	{string}	title	The string identifier for this series
 * @param	{Object}	style	Object containing series draw thickness, colors, transparency, etc...
 * @return	{bool}
 * @method 
 */
function rocketseries(data, type, title, style){
	this.data = data;
	this.type = type;
	this.title = title;
	this.style = style;
	
	if (this.style == undefined) {
		this.style = new Object();
	}
	
	if (this.style.UpColor == undefined) {
		this.style.UpColor = rocketcharts.settings.defaultUpColor;
	}
	
	if (this.style.DownColor == undefined) {
		this.style.DownColor = rocketcharts.settings.defaultDownColor;
	}
	
	return true;
}

/**
 * Series type enumeration
 */
rocketseries.seriesType = {
	LINE: "line",
	DOT: "dot",
	HISTOGRAM: "histogram",
	AREA: "area",
	DISJOINTED: "disjointed"
}

/**
 * Switches between series type and calls subsequent draw methods
 * @alias				rocketseries.draw(imageData, verticalPixelPerPoint, gridMin, w, h)
 * @param	{Array}		imageData				Array of pixel data
 * @param	{float}		verticalPixelPerPoint	The amount of pixels that represent one value point
 * @param	{float}		gridMin					The low end value of the chart
 * @param	{int}		w						Width of panel
 * @param	{int}		h						Height of panel
 * @return	{bool}
 * @method
 */
rocketseries.prototype.draw = function(imageData, verticalPixelPerPoint, gridMin, w, h){
	switch(this.type){
		case 0:
			this.drawCandlesticks(imageData, verticalPixelPerPoint, gridMin, w, h);
			break;
	}
}

rocketseries.prototype.drawCandlesticks = function(imageData, verticalPixelPerPoint, gridMin, w, h){
	
	var yCloseOld = 0;
	
	var valueOpen;
	var valueHigh;
	var valueLow;
	var valueClose;
	
	var yvalueOpen;
	var yvalueHigh;
	var yvalueLow;
	var yvalueClose;
	
	var startTick = 0;//_sizing.StartingTick;
	var horizSpacing = rocketcharts.view.horizontalPixelsPerPoint;
	var halfhorizSpacing = rocketcharts.view.halfHorizontalPixelsPerPoint;
	var lineAreaStart = h;
	var X = halfhorizSpacing;
	
	//if (startTick < 0)
	//	startTick = 0;
	
	//var dataCount = this.data.length; //_sizing.StartingTick + _sizing.VisibleTicks;
	
	//if (dataCount > _dataSource.length)
	//	dataCount = _dataSource.length;
	
	var i = 0;
	
	for (i = rocketcharts.view.startingPoint; i < rocketcharts.view.endingPoint; i++) //dataCount
	{			
		if ( this.data[i]["empty"] != true ) // Null means a market gap
		{
			valueOpen = 	this.data[i]["open"];
			valueHigh = 	this.data[i]["high"];
			valueLow = 		this.data[i]["low"];
			valueClose = 	this.data[i]["close"];
			
			yvalueOpen = lineAreaStart - (verticalPixelPerPoint * (valueOpen - gridMin));
			yvalueHigh = lineAreaStart - (verticalPixelPerPoint * (valueHigh - gridMin));
			yvalueLow = lineAreaStart - (verticalPixelPerPoint * (valueLow - gridMin));
			yvalueClose = lineAreaStart - (verticalPixelPerPoint * (valueClose - gridMin));
			
			if (valueOpen < valueClose)
			{
				line(imageData, X, yvalueHigh, X, yvalueLow, this.style.UpColor.r, this.style.UpColor.g, this.style.UpColor.b, 0xff);
				box(imageData, X-halfhorizSpacing, yvalueClose, X+halfhorizSpacing, yvalueOpen, this.style.UpColor.r, this.style.UpColor.g, this.style.UpColor.b, 0xff, false);
			}
			else
			{
				line(imageData, X, yvalueHigh, X, yvalueLow, this.style.DownColor.r, this.style.DownColor.g, this.style.DownColor.b, 0xff);
				box(imageData, X-halfhorizSpacing, yvalueOpen, X+halfhorizSpacing, yvalueClose, this.style.DownColor.r, this.style.DownColor.g, this.style.DownColor.b, 0xff, false);
			}
		}
		
		X += horizSpacing;
	}
}

function rocketpanel(canvas, height){
	this._canvas = canvas;
	this._gridMax = -100000;
	this._gridMin = 100000;
	this._series = [];
	this._indicators = [];
	this._height = 0;
	this._verticalPixelsPerPoint = 0;
	this._userHeight = height;
	
	if (this._userHeight == undefined){
		this._userHeight = .50; // Default to 50% - the formula is: if userHeight <= 1, it's percentage, else it's pixels
	}
	
	return true;
};

rocketpanel.prototype.draw = function(imageData, w){

	this.calculate();
	
	// Draw axis/grid:
	var valueAtPoint = 0;
	var yValue = 0;
	var oldY = 0;
	
	for (var i=1; i < 10; i++) {
		yValue = this._canvas.height - (this._verticalPixelsPerPoint * (i * this._gridStep));
		valueAtPoint = ((i * this._gridStep) + this._gridMin);
		rasterText(imageData, valueAtPoint.toFixed(4), w + 5, yValue - 3);
		//line(imageData, w, yValue, w + 3, yValue, 255,255,255,0xFF);
		
		if ((i % 2) == 0) {
			box(imageData, 0, yValue, w, oldY, 45, 45, 45, 0xFF);
		}
		
		oldY = yValue;
	};
	
	var legendLines = [];
	var legendPoint = rocketcharts.data[0].data.length - 1;
	
	// Draw series
	for (var i=0; i < this._series.length; i++) {
		this._series[i].draw(imageData, this._verticalPixelsPerPoint, this._gridMin, w, this._height);
		legendLines[legendLines.length] = this._series[i].title;
	};
	
	// Draw indicators
	for (var i=0; i < this._indicators.length; i++) {
		this._indicators[i].draw(imageData, this._verticalPixelsPerPoint, this._gridMin, w, this._height);
		
		for (var j=0; j < this._indicators[i]._indicator._series.length; j++) {
			legendLines[legendLines.length] = this._indicators[i]._indicator._series[j].title;	
		}
	};
	
	boxBlend(imageData, 10, 10, 210, (legendLines.length * 15) + 10, 25, 25, 25, 60);// 0xFF);
	for (var i=0; i < legendLines.length; i++) {
		rasterText(imageData, legendLines[i] , 12, 15 * (i+1));
	}
	
};

rocketpanel.prototype.addSeries = function(series){
	this._series[this._series.length] = series;
};

rocketpanel.prototype.addIndicator = function(indicator){
	this._indicators[this._indicators.length] = indicator;
};

rocketpanel.prototype.calculate = function(){
	this._height = $(this._canvas).attr("height");
	this._gridMax = -100000;
	this._gridMin = 100000;
	
	
	
	for (var i=0; i < this._series.length; i++)
	{
		//var len = this._series[i].data.length; //_sizing.StartingTick + _sizing.VisibleTicks;
		//var startValue = 0;//_sizing.StartingTick;
		
		for (var j = rocketcharts.view.startingPoint; j < rocketcharts.view.endingPoint; j++)
		{
			
			if (this._series[i].data[j]["high"] > this._gridMax)
				this._gridMax = this._series[i].data[j]["high"];
				
			if (this._series[i].data[j]["low"] < this._gridMin)
				this._gridMin = this._series[i].data[j]["low"];
		}
	}
	
	for (var i=0; i < this._indicators.length; i++)
	{
		for (var j=0; j < this._indicators[i]._indicator._series.length; j++){
			
			//var len = this._indicators[i]._indicator._data[j].length; //_sizing.StartingTick + _sizing.VisibleTicks;
			//var startValue = 0;//_sizing.StartingTick;
			
			for (var k = rocketcharts.view.startingPoint; k < rocketcharts.view.endingPoint; k++){
				if (this._indicators[i]._indicator._data[j][k] > this._gridMax)
					this._gridMax = this._indicators[i]._indicator._data[j][k];
					
				if (this._indicators[i]._indicator._data[j][k] < this._gridMin)
					this._gridMin = this._indicators[i]._indicator._data[j][k];
			}
		}
	}
	
	this._gridStep = (this._gridMax - this._gridMin) / 10;
	this._gridMin -= (this._gridStep * .25);
	this._gridMax += (this._gridStep * .25);
	this._gridStep = (this._gridMax - this._gridMin) / 10;
	
	this._verticalPixelsPerPoint = this._height / (this._gridMax - this._gridMin);
	
	console.log("Calculate called, _height: " + this._height + ", _verticalPixelsPerPoint: " + this._verticalPixelsPerPoint)
};

// id = lookup in public indicator array
function rocketindicator(id, data, params, series){
	// lookup the right function (object) to create based on the id and pass it the data
	var calc = new rocketindicatorcalculations();
	this._indicator = new calc[id](data, params, series);
}

rocketindicator.prototype.draw = function(imageData, verticalPixelPerPoint, gridMin, w, h){
	for(var i=0; i<this._indicator._series.length; i++){
		switch(this._indicator._series[i].type){
			case rocketseries.seriesType.LINE:
				this.drawLine(imageData, verticalPixelPerPoint, gridMin, w, h, i);
				break;
			case rocketseries.seriesType.HISTOGRAM:
				this.drawHistogram(imageData, verticalPixelPerPoint, gridMin, w, h, i);
				break;
			case rocketseries.seriesType.DOT:
				this.drawDot(imageData, verticalPixelPerPoint, gridMin, w, h, i);
				break;
		}
	}
	
	var yValue = 0;
	
	if (this._indicator._constantLines != undefined) {
		for (var i=0; i<this._indicator._constantLines.length; i++) {
			yValue = h - (verticalPixelPerPoint * (this._indicator._constantLines[i].value - gridMin));
			line(imageData, 0, yValue, w, yValue, 255, 255, 255, 255, 1);
		}
	}
}

rocketindicator.prototype.drawLine = function(imageData, verticalPixelPerPoint, gridMin, w, h, s){
	var indicatorData = this._indicator._data;
	var seriesLength = 0;
	var lastValue = 0;
	var lastValueOld = 0;
	var i = 0;
	
	var horizSpacing = rocketcharts.view.horizontalPixelsPerPoint;
	var halfhorizSpacing = rocketcharts.view.halfHorizontalPixelsPerPoint;
	var barHeight = 0;
	var X = halfhorizSpacing;
	var smoothing = false; //Preferences.EnableSmoothing;
	
	seriesLength = indicatorData[s].length;
	
	// ENSURE COLOR is 100% ALPHA:
	/*
	var c = indicator.seriesColor(s);
	var r1:uint= ((c & 0x00FF0000) >> 16);
	var g1:uint= ((c & 0x0000FF00) >> 8);
	var b1:uint= ((c & 0x000000FF));
	var ac:Number=0xFF;
	var n:uint=(ac<<24)+(r1<<16)+(g1<<8)+b1;
	*/
	
	for (i = rocketcharts.view.startingPoint; i < rocketcharts.view.endingPoint; i++)
	{
		if (indicatorData[s][i] != null)
		{
			lastValue = h - (verticalPixelPerPoint * (indicatorData[s][i] - gridMin));
			
			if (lastValueOld != 0)
			{
				if (smoothing)
				{
					//Raster.aaLine(bd, X - _sizing.HorizontalPixelsPerPoint, lastValueOld, X, lastValue, n);
				}
				else
				{
					line(imageData, X - horizSpacing, lastValueOld, X, lastValue, 255, 255, 255, 255, 2);
				}
				lastValue = h - (verticalPixelPerPoint * (indicatorData[s][i] - gridMin));							
			}

			lastValueOld = lastValue;
		}
		
		X += horizSpacing;
	}
}

rocketindicator.prototype.drawDot = function(imageData, verticalPixelPerPoint, gridMin, w, h, s){
	var indicatorData = this._indicator._data;
	var seriesLength = 0;
	var lastValue = 0;
	var lastValueOld = 0;
	var i = 0;
	
	var horizSpacing = rocketcharts.view.horizontalPixelsPerPoint;
	var halfhorizSpacing = rocketcharts.view.halfHorizontalPixelsPerPoint;
	
	var X = halfhorizSpacing;
	
	seriesLength = indicatorData[s].length;
	
	for (i = rocketcharts.view.startingPoint; i < rocketcharts.view.endingPoint; i++)
	{
		if (indicatorData[s][i] != null)
		{
			lastValue = h - (verticalPixelPerPoint * (indicatorData[s][i] - gridMin));
			box(imageData, X - 1, lastValue - 1, X, lastValue, 255, 255, 255, 255);
		}
		
		X += horizSpacing;
	}
}

rocketindicator.prototype.drawHistogram = function(imageData, verticalPixelPerPoint, gridMin, w, h, s){
	var indicatorData = this._indicator._data;
	var seriesCount = indicatorData.length;
	var seriesLength = 0;
	var lastValue = 0;
	var i = 0;
	var x = 0;
	var horizSpacing = rocketcharts.view.horizontalPixelsPerPoint;
	var halfhorizSpacing = rocketcharts.view.halfHorizontalPixelsPerPoint;
	var barHeight = 0;
	var counter = halfhorizSpacing;
	
	var smoothing = false; //Preferences.EnableSmoothing;
	
	seriesLength = indicatorData[s].length;
	
	// ENSURE COLOR is 100% ALPHA:
	/*
	var c = indicator.seriesColor(s);
	var r1:uint= ((c & 0x00FF0000) >> 16);
	var g1:uint= ((c & 0x0000FF00) >> 8);
	var b1:uint= ((c & 0x000000FF));
	var ac:Number=0xFF;
	var n:uint=(ac<<24)+(r1<<16)+(g1<<8)+b1;
	*/
	
	for (i = rocketcharts.view.startingPoint; i < rocketcharts.view.endingPoint; i++)
	{
		if (indicatorData[s][i] != null)
		{
			/**
			 *  Optimizing code; Math.abs is slow, using bitwise is fast
			 * 	Note: This only works with integer math; thus, the optimizations are
			 * 	used in drawing code, where the result will need to be int's anyways
			 * */
			
			/** Original code: **/
			// barHeight = verticalPixelPerPoint * (Math.abs(indicatorData[s][i]));
			
			/** Optimized code: **/
			barHeight = indicatorData[s][i] * verticalPixelPerPoint;
			x = barHeight;
			barHeight = ((x ^ (x >> 31)) - (x >> 31));
			
			if (barHeight == 0)
				barHeight++;
			
			if (indicatorData[s][i] > 0)
			{	
				box(imageData, 
					counter - halfhorizSpacing + 1, 
				 	h - (verticalPixelPerPoint * (indicatorData[s][i] - gridMin)), 
				 	counter + halfhorizSpacing - 1,
				 	h - (verticalPixelPerPoint * (0 - gridMin)), 
				 	190, 
				 	190,
				 	190,
				 	0xFF, 
				 	false);
			}
			else
			{
				box(imageData, 
					counter - halfhorizSpacing + 1, 
				 	h - (verticalPixelPerPoint * (0 - gridMin)), 
				 	counter + halfhorizSpacing - 1,
				 	h - (verticalPixelPerPoint * (0 - gridMin)) + barHeight, 
				 	190, 
				 	190,
				 	190,
				 	0xFF, 
				 	false);
			}
		}
		
		counter += horizSpacing;
	}
}

/**
 * Create a new framework of utility functions.
 * @classDescription			Creates a new framework of utility functions.
 * @type	{Object}
 * @return	{Boolean}		Returns true.
 * @constructor
 */
function rocketindicatorcalculations() {
	
	return true;
}

/**
 * Utility function exposed to indicators allowing quick calculation of an SMA on any dataset
 * @alias				rocketindicatorcalculations.calculateSMA(periods, data);
 * @param	{int}		periods	
 * @param	{Array}		data	The array of data to calculate SMA from...
 * @return	{Array}
 * @method
 */
rocketchart.prototype.calculateSMA = function(periods, data) {
	var count = data.length;
	var returnArray = [];
	var total = 0;
	
	for (var j = 0; j<count; j++)
	{
		returnArray[j] = null;
	}
	
	var startIndex = 0;
	
	for (var k = 0; k < count; k++)
	{
		if (data[k] != null)
		{
			startIndex = k + periods;
			break;
		}
	}
		
	for (var i = startIndex; i < count; i++)
	{
		for (var j = 0; j < periods; j++)
		{
			total += data[i - j];
		}
		
		returnArray[i] = total / periods;
		total = 0;
	}
	
	return returnArray;
}

/**
 * Accept an array of OHLC data and an array of parameters, then performs the simple moving average calculation.
 * @alias				MHUtils.objConvert(arr)
 * @param	{Array}		data	The array of OHLC data
 * @param	{Array}		params	The array of user-supplied parameters
 * @return	{Object}			Returns the indicator data
 * @method
 */
rocketindicatorcalculations.prototype.simplemovingaverage = function (data, params, series) {
	this._params = params;
	this._series = series;
	this._sourceData = data;
	this._data = [];
	
	if (this._series == undefined){
		this._series = [];
		this._series[0] = {type: rocketseries.seriesType.LINE, title: "SMA", color: 0xFF0000};
	}
	
	if (this._params == undefined){
		// Create default params, will also serve the purpose of declaring the parameters
		this._params = [];
		this._params[0] = {name: 'Periods', type: 'int', value: 9};
	}
	
	this.calculate = function(){
		if (this._sourceData != null) {
			var total = 0;
			var j = 0;
			var count = this._sourceData.length;
			this._data = [];
			for (var i = 0; i<this._series.length; i++){
				this._data[i] = [];
			}
			
			//var smaValues:Array = new Array(count);
			
			for (j = 0; j<this._params[0].value; j++)
			{
				this._data[0][j] = null;
			}
			
			for (var i = this._params[0].value - 1; i < count; i++)
			{
				for (j = 0; j < this._params[0].value; j++)
				{
					total += this._sourceData[i - j]["close"];
				}
				
				this._data[0][i] = total / this._params[0].value;
				total = 0;
			}
		}
	}
	
	this.calculate();
};

rocketindicatorcalculations.prototype.weightedmovingaverage = function (data, params, series) {
	this._params = params;
	this._series = series;
	this._sourceData = data;
	this._data = [];
	
	if (this._series == undefined){
		this._series = [];
		this._series[0] = {type: rocketseries.seriesType.LINE, title: "WMA", color: 0xFF0000};
	}
	
	if (this._params == undefined){
		// Create default params, will also serve the purpose of declaring the parameters
		this._params = [];
		this._params[0] = {name: 'Periods', type: 'int', value: 9, min: 2, max: 200, step: 1};
	}
	
	this.calculate = function(){
		if (this._sourceData != null) {
			var total = 0;
			var j = 0;
			var count = this._sourceData.length;
			var sumofdays = Math.floor((this._params[0].value * (this._params[0].value + 1)) / 2);
			
			this._data = [];
			for (var i = 0; i<this._series.length; i++){
				this._data[i] = [];
			}
			
			for (j = 0; j<this._params[0].value; j++)
			{
				this._data[0][j] = null;
			}
			
			for (var i = this._params[0].value - 1; i < count; i++)
			{
				for (j = 0; j < this._params[0].value; j++)
				{
					total += (this._sourceData[i - j]["close"] * (j+1));
				}
				
				this._data[0][i] = total / sumofdays;
				total = 0;
			}
		}
	}
	
	this.calculate();
};

rocketindicatorcalculations.prototype.movingaverageconvergencedivergence = function (data, params, series) {
	this._params = params;
	this._series = series;
	this._sourceData = data;
	this._data = [];
	
	if (this._series == undefined){
		this._series = [];
		this._series[0] = {type: rocketseries.seriesType.HISTOGRAM, title: "MACD Histogram", color: 0xFF0000};
		this._series[1] = {type: rocketseries.seriesType.LINE, title: "MACD Trigger", color: 0xFFFFFF};
		this._series[2] = {type: rocketseries.seriesType.LINE, title: "MACD", color: 0x666666};
	}
	
	if (this._params == undefined){
		// Create default params, will also serve the purpose of declaring the parameters
		this._params = [];
		this._params[0] = {name: 'Slow EMA Periods', type: 'int', value: 9};
		this._params[1] = {name: 'Fast EMA Periods', type: 'int', value: 12};
		this._params[2] = {name: 'Trigger EMA Periods', type: 'int', value: 9};
	}
	
	this.calculateEMA = function (data, periods) {
		var returnArray = [];
		var total = 0;
		var j = 0;
		
		var multiplier = (2 / (periods + 1));
		var count = data.length;
		
		for (j = 0; j<count; j++)
		{
			returnArray[j] = null;
		}
		
		for (var i = periods - 1; i < count; i++)
		{
			if (returnArray[i - 1] == null)
			{
				// First EMA value is actually a calculated SMA:
				for (j = 0; j < periods; j++)
				{
					total += data[i - j];
				}
				
				returnArray[i] = total / periods;
			}
			else
			{
				returnArray[i] = ((data[i] - returnArray[i-1]) * multiplier) + returnArray[i-1];
			}
		}
		
		return returnArray;
	}
	
	this.calculate = function(){
		if (this._sourceData != null) {
			var i = 0;
			var closeArray = [];
			var MACDValues = [];
			var count = this._sourceData.length;
			
			for (i = 0; i < count; i++){
				closeArray[i] = this._sourceData[i]["close"];
			};
			
			/** STAGE 1: Calculate MACD Line */
			
			var slowEMA = this.calculateEMA(closeArray, this._params[0].value);
			var fastEMA = this.calculateEMA(closeArray, this._params[1].value);
			
			for (i = 0; i < count; i++)
			{
				if (fastEMA[i] == null)
				{
					MACDValues[i] = null;
				}
				else
				{
					MACDValues[i] = slowEMA[i] - fastEMA[i];
				}
			}
			
			/** STAGE 2: Calculate "Trigger" Line (typically 9 day EMA) */
			var triggerValues = this.calculateEMA(MACDValues, this._params[2].value);
			
			/** STAGE 3: Calculate Histogram */
			var histogramValues = [];
			
			for (i = 0; i < count; i++)
			{
				if (MACDValues[i] == null)
				{
					histogramValues[i] = null;
				}
				else
				{
					histogramValues[i] = MACDValues[i] - triggerValues[i];
				}
			}
			
			this._data = [];
			for (var i = 0; i<this._series.length; i++){
				this._data[i] = [];
			}
			
			this._data[0] = histogramValues;
			this._data[1] = triggerValues;
			this._data[2] = MACDValues;
			
		}
	}
	
	this.calculate();
};

rocketindicatorcalculations.prototype.stochasticfast = function (data, params, series) {
	this._params = params;
	this._series = series;
	this._sourceData = data;
	this._data = [];
	
	if (this._params == undefined){
		// Create default params, will also serve the purpose of declaring the parameters
		this._params = [];
		this._params[0] = {name: 'Periods', type: 'int', value: 14};
		this._params[1] = {name: 'Overbought Guideline', type: 'int', value: 80}; // TODO: Add min, max, step values
		this._params[2] = {name: 'Oversold Guideline', type: 'int', value: 20};
	}
	
	if (this._series == undefined){
		this._series = [];
		this._series[0] = {type: rocketseries.seriesType.LINE, title: "SO Fast %K - " + this._params[0].value, color: 0xFF0000};
		this._series[1] = {type: rocketseries.seriesType.LINE, title: "SO Fast %D - 3", color: 0x999999};
	}
	
	this._constantLines = [];
	this._constantLines[0] = {value: this._params[1].value, color: 0xFFFFFF};
	this._constantLines[1] = {value: this._params[2].value, color: 0xFFFFFF};
	
	this.calculate = function(){
		if (this._sourceData != null) {
			var j = 0;
			var count = this._sourceData.length;
			
			this._data = [];
            for (var i = 0; i<this._series.length; i++){
                this._data[i] = [];
            }
			
			var pKValues = [];
			var pDValues = [];
			
			for (j = 0; j<count; j++)
			{
				pKValues[j] = null;
				pDValues[j] = null;
			}
			
			var periods = this._params[0].value;
			
			var HighestHigh = 0;
			var LowestLow = 5000;
			
			for (var i = periods; i < count; i++)
			{
				for (j=0; j < periods; j++)
				{
					if (this._sourceData[i-j]["high"] > HighestHigh)
						HighestHigh = this._sourceData[i-j]["high"];
						
					if (this._sourceData[i-j]["low"] < LowestLow)
						LowestLow = this._sourceData[i-j]["low"];
				}
				
				if (HighestHigh != LowestLow)
				{
					pKValues[i] = ((this._sourceData[i]["close"] - LowestLow) / (HighestHigh - LowestLow)) * 100;
				}
				else
				{
					pKValues[i] = pKValues[i-1];
				}
				
				HighestHigh = 0;
				LowestLow = 5000;
			}
			
			pDValues = rocketcharts.calculateSMA(3, pKValues);
			
			this._data[0] = pKValues;
			this._data[1] = pDValues;
		}
	}
	
	this.calculate();
};

rocketindicatorcalculations.prototype.parabolicsar = function (data, params, series) {
	this._params = params;
	this._series = series;
	this._sourceData = data;
	this._data = [];
	
	if (this._series == undefined){
		this._series = [];
		this._series[0] = {type: rocketseries.seriesType.DOT, title: "SAR", color: 0xFF0000};
	}
	
	if (this._params == undefined){
		// Create default params, will also serve the purpose of declaring the parameters
		this._params = [];
		this._params[0] = {name: 'Acceleration', type: 'float', value: 0.02};
		this._params[1] = {name: 'Acceleration Ceiling', type: 'float', value: 0.2};
	}
	
	this.calculate = function(){
		if (this._sourceData != null) {
			
			var i = 0;
			
			for (var i = 0; i<this._series.length; i++){
				this._data[i] = [];
			}
			
			var RecordCount = this._sourceData.length;
			var Record = 0;
		    var Period = 0;
			var Start = 0;
			var Position = 0;
			
		    var Max = 0;
		    var Min = 0;
		    var pSAR = 0;
		    var pEP = 0;
		    var pAF = 0;
		    var SAR = 0;
		    var AF = 0;
		    var Hi = 0;
		    var Lo = 0;
		    var pHi = 0;
		    var pLo = 0;
		    
		    var MinAF = this._params[0].value;
			var MaxAF = this._params[1].value;
			
			Start = 2;
			
			Max = this._sourceData[1]["high"];
			Min = this._sourceData[1]["low"];
			
			if ((this._sourceData[2]["high"] - this._sourceData[1]["high"]) < (this._sourceData[2]["low"] - this._sourceData[1]["low"]))
			{
				pSAR = Max;
				Position = -1;
			}
			else
			{
				pSAR = Min;
				Position = 1;
			}
			
			pAF = MinAF;
			SAR = pSAR;
			Hi = Max;
			Lo = Min;
			pHi = Hi;
			pLo = Lo;
			AF = MinAF;
			
			for (Record = Start; Record < RecordCount; ++Record)
			{
				if (Position == 1)
				{
					if (this._sourceData[Record]["high"] > Hi)
					{
						Hi = this._sourceData[Record]["high"];
						if (AF < MaxAF)
							AF = AF + MinAF;
					}
					
					SAR = pSAR + pAF * (pHi - pSAR);
				
					if (this._sourceData[Record]["low"] < SAR)
					{
						Position = -1;
						AF = MinAF;
						SAR = pHi;
						Hi = 0;
						Lo = this._sourceData[Record]["low"];
					}
				}
				else if (Position == -1)
				{
					if (this._sourceData[Record]["low"] < Lo)
					{
						Lo = this._sourceData[Record]["low"];
						if (AF < MaxAF)
							AF = AF + MinAF;
					}
					
					SAR = pSAR + pAF * (pLo - pSAR);
					
					if (this._sourceData[Record]["high"] > SAR)
					{
						Position = 1;
						AF = MinAF;
						SAR = pLo;
						Lo = 0;
						Hi = this._sourceData[Record]["high"];
					}
				}
				
				pHi = Hi;
		        pLo = Lo;
		        pSAR = SAR;
		        pAF = AF;
		        
		        this._data[0][Record] = SAR;
			}
			
		}
	}
	
	this.calculate();
};


function box(context,x0,y0,x1,y1,r,g,b,a,border){
	
	var xinc;
	var yinc;
	var cumul;
	var x;
	var y;
	x = x0;
	y = y0;
	
	// Do this to remove the <= from the loops, and use <
	x1++;
	y1++;
	
	if (border)
	{
		for (y=y0; y<y1; y++) // row by row from the top down
		{
			for (x=x0; x<x1; x++)
			{
				
				if ( y==y0 || y==(y1-1) || x==x0 || x==(x1-1) )
				{
					setPixel(context, x, y, 0, 0, 0, a);
				}
				else
				{
					setPixel(context, x, y, r, g, b, a);
				}
			}
		}
	}
	else
	{
		for (y=y0; y<y1; y++) // row by row from the top down
		{
			for (x=x0; x<x1; x++)
			{
				setPixel(context, x, y, r, g, b, a);
			}
		}
	}
}

function line(context,x0,y0,x1,y1,r,g,b,a,w){
	w = 1;
	var dx;
	var dy;
	var i;
	var xinc;
	var yinc;
	var cumul;
	var x;
	var y;
	x = x0;
	y = y0;
	dx = x1 - x0;
	dy = y1 - y0;
	xinc = ( dx > 0 ) ? 1 : -1;
	yinc = ( dy > 0 ) ? 1 : -1;
	dx = Math.abs(dx);
	dy = Math.abs(dy);
	
	setPixel(context, x, y, r, g, b, a);
	
	if ( dx > dy ){
			cumul = dx / 2 ;
			for ( i = 1 ; i <= dx ; i++ ){
					x += xinc;
					cumul += dy;
					if (cumul >= dx){
							cumul -= dx;
							y += yinc;
					}
					
					
					switch (w)
					{
						case 4:
							setPixel(context, x, y-2, r, g, b, a);
						case 3:
							setPixel(context, x, y-1, r, g, b, a);
						case 2:
							setPixel(context, x, y+1, r, g, b, a);
						case 1:
							setPixel(context, x, y, r, g, b, a);
							break;
					}
					
			}
	}else{
			cumul = dy / 2;
			for ( i = 1 ; i <= dy ; i++ ){
					y += yinc;
					cumul += dx;
					if ( cumul >= dy ){
							cumul -= dy;
							x += xinc ;
					}
					
					switch (w)
					{
						case 4:
							setPixel(context, x, y-2, r, g, b, a);
						case 3:
							setPixel(context, x, y-1, r, g, b, a);
						case 2:
							setPixel(context, x, y+1, r, g, b, a);
						case 1:
							setPixel(context, x, y, r, g, b, a);
							break;
					}
			}
	}
}

function setPixel(imageData, x, y, r, g, b, a) {
    var index = (parseInt(x) + parseInt(y) * imageData.width) * 4;
    imageData.data[index+0] = r;
    imageData.data[index+1] = g;
    imageData.data[index+2] = b;
    imageData.data[index+3] = a;
}

function boxBlend(context,x0,y0,x1,y1,r,g,b,a,border){
	
	var xinc;
	var yinc;
	var cumul;
	var x;
	var y;
	x = x0;
	y = y0;
	
	// Do this to remove the <= from the loops, and use <
	x1++;
	y1++;
	
	if (border)
	{
		for (y=y0; y<y1; y++) // row by row from the top down
		{
			for (x=x0; x<x1; x++)
			{
				
				if ( y==y0 || y==(y1-1) || x==x0 || x==(x1-1) )
				{
					setPixel(context, x, y, 0, 0, 0, a);
				}
				else
				{
					setPixel(context, x, y, r, g, b, a);
				}
			}
		}
	}
	else
	{
		for (y=y0; y<y1; y++) // row by row from the top down
		{
			for (x=x0; x<x1; x++)
			{
				setPixelBlend(context, x, y, r, g, b, a);
			}
		}
	}
}

function setPixelBlend(imageData, x, y, r, g, b, a) {
    var index = (parseInt(x) + parseInt(y) * imageData.width) * 4;
    var newAlpha = a / 255.0;
	
	imageData.data[index+0] = (1.0 - newAlpha) * r + newAlpha * imageData.data[index+0];
    imageData.data[index+1] = (1.0 - newAlpha) * g + newAlpha * imageData.data[index+1];
    imageData.data[index+2] = (1.0 - newAlpha) * b + newAlpha * imageData.data[index+2];
    imageData.data[index+3] = 255.0;
}

function getPixel(imageData, x, y) {
    var index = (parseInt(x) + parseInt(y) * imageData.width) * 4;
    return {r: imageData.data[index+0],
    		g: imageData.data[index+1],
    		b: imageData.data[index+2],
    		a: imageData.data[index+3]};
}

function rasterText(imageData, text, x, y) {
	var len = text.length;
	var i = 0;
	var code = 0;
	var characterPixelLength = -1;
	
	var startX = x;
	var startY = y;
	
	for (i=0; i < len; i++) {
		code = text.charCodeAt(i) - 33;
		if (code > -1) {
			characterPixelLength = rocketcharts.fontPoints[code].length;
			
			for (var j=0; j < characterPixelLength; j++) {
				setPixel(imageData,
						 startX + rocketcharts.fontPoints[code][j].x,
						 startY + rocketcharts.fontPoints[code][j].y,
						 255, 255, 255, 0xFF);
			};
		}
		
		startX += 6;
	};
}

function randomInRange(minVal,maxVal)
{
  var randVal = minVal+(Math.random()*(maxVal-minVal));
  return randVal;
}

/*
 * TODO: I am debating this functionality being included in the library...
 * Really, we should just have the methods to add indicators/series/etc and have
 * users develop a gui to consume said methods... but for now we'll keep it; better I guess
 * to illustate 'here is a simple way of doing it.'
 */
function GenerateDialogs(element, indicators) {
	var addIndicatorDialog = "<div id=\"rocketcharts-addIndicator-dialog-form\" title=\"Add New Indicator\">" +
	"<div id=\"tabs\">" +
	"<ul>" +
		"<li><a href=\"#tabs-1\">Nuts & Bolts</a></li>" +
		"<li><a href=\"#tabs-2\">Appearance</a></li>" +
	"</ul>" +
			"<div id=\"tabs-1\">" +
				"<label for=\"rocketcharts-addIndicator-select\">Type:</label>" +
				"<select id=\"rocketcharts-addIndicator-select\">";
	
	for (var i=0; i < indicators.length; i++) {
	  addIndicatorDialog += "<option value=\"" + indicators[i].id + "\">" + indicators[i].name + "</option>";
	};
				
	addIndicatorDialog += "</select><br />" + 
				"<label for=\"rocketcharts-dataSource-select\">Data Source:</label>" +
				"<select id=\"rocketcharts-dataSource-select\">" +
				"</select><br />" + 
				"<div id=\"indicator-params\">";
	
	var calc = new rocketindicatorcalculations();
	var indicator = new calc["simplemovingaverage"]();
				
	for (var i=0; i < indicator._params.length; i++) {
	  addIndicatorDialog += "<label for=\"param" + i + "\">" + indicator._params[i].name + "</label>";
	  
	  switch (indicator._params[i].type) {
	  	case "int":
	  		addIndicatorDialog += "<input class=\"rocketcharts-input-int\" type=\"text\" name=\"param" + i + "\" value=\"" + indicator._params[i].value + "\"><br />";
	  		break;
	  }
	  
	};

		addIndicatorDialog += "</div>" +
			"</div>" +
			"<div id=\"tabs-2\">" +
				"<label for=\"rocketcharts-panel-select\">Panel:</label>" +
				"<select id=\"rocketcharts-panel-select\">" +
			"</div>" +
		"</div>";
		
		$(element).prepend(addIndicatorDialog);
		
		$('.rocketcharts-input-int').spinner({ min: 0, max: 100, increment: 'fast' });
		
		$( "#rocketcharts-addIndicator-select" ).change(function(){
			var calc = new rocketindicatorcalculations();
			var indicator = new calc[$(this).attr('value')]();
			var indicatorMarkup = "";
			
			$( "#indicator-params" ).empty();
			
			for (var i=0; i < indicator._params.length; i++) {
			  indicatorMarkup += "<label for=\"param" + i + "\">" + indicator._params[i].name + "</label>";
			  
			  switch (indicator._params[i].type) {
			  	case "int":
			  		indicatorMarkup += "<input class=\"rocketcharts-input-int\" type=\"text\" name=\"param" + i + "\" value=\"" + indicator._params[i].value + "\"><br />";
			  		break;
			  }
			  						
			};
			
			$( "#indicator-params" ).append(indicatorMarkup);
			
			$('.rocketcharts-input-int').spinner({ min: 0, max: 100, increment: 'fast' });
			
		});
		
		$( "#rocketcharts-addIndicator-dialog-form" ).dialog({
			autoOpen: false,
			height: 400,
			width: 500,
			modal: true,
			buttons: {
				"Add Indicator": function() {
					var params = [];
					$("#indicator-params input").each(function(i,e) {
						
						params[params.length] = {value: parseInt($(this).attr("value"))};
					});
					
					rocketcharts.addIndicator($( "#rocketcharts-addIndicator-select" ).attr("value"), 
											params,
											parseInt($( "#rocketcharts-dataSource-select" ).attr("value")),
											parseInt($( "#rocketcharts-panel-select" ).attr("value")));
					
					$( this ).dialog( "close" );
				},
				Cancel: function() {
					$( this ).dialog( "close" );
				}
			},
			close: function() {
				//allFields.val( "" ).removeClass( "ui-state-error" );
			},
			open: function () {
				$( "#rocketcharts-dataSource-select" ).empty();
				var optionsMarkup = "";
				
				for (var i=0; i < rocketcharts.data.length; i++) {
				  optionsMarkup += "<option value=\"" + i + "\">" + rocketcharts.data[i].title + "</option>";
				};
				
				$( "#rocketcharts-dataSource-select" ).append(optionsMarkup);
				
				
				$( "#rocketcharts-panel-select" ).empty();
				optionsMarkup = "";
				
				for (var i=0; i < rocketcharts.panels.length; i++) {
				  optionsMarkup += "<option value=\"" + i + "\">Panel " + (i + 1) + "</option>";
				};
				
				$( "#rocketcharts-panel-select" ).append("<option value=\"-1\">New Panel</option>");
				$( "#rocketcharts-panel-select" ).append(optionsMarkup);
				
				$('#tabs').tabs();
			}
		});
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r,g,b) {return "#" + toHex(r)+toHex(g)+toHex(b)}
function toHex(N) {
 if (N==null) return "00";
 N=parseInt(N); if (N==0 || isNaN(N)) return "00";
 N=Math.max(0,N); N=Math.min(N,255); N=Math.round(N);
 return "0123456789ABCDEF".charAt((N-N%16)/16)
      + "0123456789ABCDEF".charAt(N%16);
}

function formatRate(value) {
	var formattedString = "";
	
	if (value != null) {
		formattedString = value.toFixed(4);
	}
	
	return formattedString;
}

function GeneratePriceHistory(){
	var data = [];
	
	var nOpen = 1.4316;
	var nHigh = 1.4324;
	var nLow = 1.4315;
	var nClose = 1.4321;
	
	var dDate = new Date();
	dDate = new Date(dDate.getTime() - (250 * 60 * 1000));

	for (var i = 0; i<250; i++)
	{
		data[i] =
			{
				open: nOpen,
				high: nHigh, 
				low: nLow,
				close: nClose,
				date: dDate.format("mm/dd/yy hh:MM:ss TT")
			};
		
		nOpen = nClose;
		nHigh = nOpen + Math.random();
		nLow  = nOpen - Math.random();
		nClose = randomInRange(nLow, nHigh, 4);
		dDate.setTime(dDate.getTime() + (1 * 60 * 1000));
	}	
	
	return data;
}