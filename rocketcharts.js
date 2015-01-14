/**
 * Base class, keeps track of our panels, settings, metrics and data, also exposes indicator enum
 * @alias				rocketcharts
 * @return	{bool}
 * @method
 */
function Rocketchart() {
	this.panels = [];
	this.panelOverlays = [];
	this.data = [];
	this.element;
	this.indicators = [{name: 'Simple Moving Average', id: 'simplemovingaverage'},
					   {name: 'Weighted Moving Average', id: 'weightedmovingaverage'},
					   {name: 'Moving Average Convergance/Divergance', id: 'movingaverageconvergencedivergence'},
					   {name: 'Parabolic SAR', id: 'parabolicsar'},
					   {name: 'Bollinger Bands', id: 'bollingerbands'},
					   {name: 'Stochastic Oscillator Fast', id: 'stochasticfast'}];
	
	
	// Used internally to assign IDs to indicators across panel boundaries,
	// i.e. indicatorIndex[0] = {panelID: 1, indicatorID: 0}
	// so I can call removeIndicator(0), rather than looking up a panel and
	// calling remove on the panel directly.
	this.indicatorIndex = [];
	
	this.priceAxisWidth = 75;
					   
	this.settings = {
		debug: false,
		minimumPanelHeight:200,
		defaultUpColor:"#00EAFF",
		defaultDownColor:"#005F6B",
		backgroundColor:"#343838"
	};
	
	this.view = {
		horizontalPixelsPerPoint : 0,
		halfHorizontalPixelsPerPoint : 0,
		startingPoint : 0,
		endingPoint : 0
	};
	
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
Rocketchart.prototype.init = function(element, settings){
	var self = this;
	// store parent element after looking it up with jquery
	self.element = $(element);
	self.width = self.element.width();
	
    self.element.css("position", "relative");
	self.element.append("<div id=\"panels\" style=\"height: 100%; width: 100%; position: relative;\"></div>");
	var panelsElement = $("#panels", self.element);
	
	panelsElement.css("overflow", "auto");
	panelsElement.css("margin", "0");
    panelsElement.css("padding", "0");
	
	$(window).resize(function() {
        self.resize(self.element.width(), self.element.height());
		self.draw();
	});
	
	panelsElement.bind("mousedown", function(event, ui) {
		$(this).bind( "mousemove", function(event, ui) {
			
			var rect = self.panels[0]._canvas.getBoundingClientRect(); 
            var relativeX = event.pageX - rect.left;
            var relativeY = event.pageY - self.element.offset().top + $(this).scrollTop();
            
            self.headsUpDisplay(relativeX, relativeY);
        
		});
		this.style.cursor = 'crosshair';
		
        var rect = self.panels[0]._canvas.getBoundingClientRect(); 
		var relativeX = event.pageX - rect.left;
	    var relativeY = event.pageY - self.element.offset().top + $(this).scrollTop();
		
		self.headsUpDisplay(relativeX, relativeY);

		return false; // Prevents browser from changing cursor to 'I-Beam', thinking we are trying to select text
	});
	panelsElement.bind("mouseup", function(event, ui) {
		$(this).unbind( "mousemove" );
		this.style.cursor = 'default';

		self.clearHUD();
	});
	
	//If settings were passed in, apply them to the instance settings.
	if (!!settings) {
		$.extend(self.settings, settings);
	}
	
	self.settings.defaultUpColor = hexToRgb(self.settings.defaultUpColor);
	self.settings.defaultDownColor = hexToRgb(self.settings.defaultDownColor);
	self.settings.backgroundColor = hexToRgb(self.settings.backgroundColor);
	
	if (self.settings.resizable)
		self.element.resizable();
	
	self.element.append("<div style=\"height: 15px; font-size: 1em; line-height: 1em; width: 100%; position: absolute; bottom: 0; z-index: 2; background-color: " + rgbToHex(self.settings.backgroundColor.r, self.settings.backgroundColor.g, self.settings.backgroundColor.b) + ";\">" +
							"<canvas id=\"dateAxisCanvas\" width=\"" + self.width + "\" height=\"15\"></canvas>" +
						"</div>");
	
	self.dateAxisCanvas = $("#dateAxisCanvas", self.element).get(0);
};

/**
 * Handles element resizing
 * @alias				rocketcharts.resize(w, h)
 * @param	{int}		w	Width
 * @param	{int}		h	Height
 * @return	{void}
 * @method
 */
Rocketchart.prototype.resize = function(w, h){
	var self = this;
	/*
	 * The code relating to calcHeight was for dynamically resizing the height of the panels
	 * when the end-user resized them via JQueryUI - putting this on hold for the moment
	 */
	
	// var calcHeight = 0;
	
	self.width = w;
	self.dateAxisCanvas.setAttribute("width", w);
	var simpleHeight = Math.floor(h / self.panels.length) - 1;
	
	if (simpleHeight < self.settings.minimumPanelHeight) {
		simpleHeight = self.settings.minimumPanelHeight;
	}
	
	for (var i=0; i < self.panels.length; i++) {
		
		/*
		if (this.panels[i]._userHeight <= 1){
			calcHeight = this.panels[i]._userHeight * h;
		} else {
			calcHeight = this.panels[i]._userHeight;
		}
		*/
		
		// update the width and height of the canvas
		self.panels[i]._canvas.setAttribute("width", w - 1);
		self.panels[i]._canvas.setAttribute("height", simpleHeight);
		self.panels[i]._canvas.style.top = simpleHeight * i;
		
		self.panelOverlays[i].setAttribute("width", w - 1);
		self.panelOverlays[i].setAttribute("height", simpleHeight);
		self.panelOverlays[i].style.top = simpleHeight * i;
		
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
Rocketchart.prototype.headsUpDisplay = function(x, y){
	var self = this;
	var dateAxisWidth = self.width - self.priceAxisWidth;
	
	var displayedPoints = self.view.endingPoint - self.view.startingPoint;
	var horizontalPixelsPerPoint = self.view.horizontalPixelsPerPoint;
	var halfhorizSpacing = self.view.halfHorizontalPixelsPerPoint;
	
	var point = -1;
	
	if (x > dateAxisWidth) {
		// flag the removal of info box
		return;
	} else {
		point = Math.floor(x / horizontalPixelsPerPoint);
	}
	
	var pointX = (point * horizontalPixelsPerPoint) + halfhorizSpacing;
	point = point + self.view.startingPoint;
	
	var height = 0;
	var width = 0;
	
	var bottom = 0;
	var calcY = 0;
	
	var legendLines = [];
	
	for (var i=0; i < self.panelOverlays.length; i++) {
		
		// grab the datacontext of the canvas
		var context = self.panelOverlays[i].getContext("2d");
		
		// read the height of the canvas
		height = parseInt(self.panelOverlays[i].getAttribute("height"));
		width = parseInt(self.panelOverlays[i].getAttribute("width"));
		
		// create a new pixel array
		var imageData = context.createImageData(width, height);
		
		line(imageData, pointX, 0, pointX, height, 255, 255, 255, 255, 1);
		
		bottom = self.panelOverlays[i].offsetTop + self.panelOverlays[i].height;
		
		if ((y > self.panelOverlays[i].offsetTop) && (y < bottom) ) {
			calcY = y - self.panelOverlays[i].offsetTop;
			line(imageData, 0, calcY, width, calcY, 255, 255, 255, 255, 1);
		}
		
		// HUD:
		for (var s=0; s < self.panels[i]._series.length; s++) {
			legendLines[legendLines.length] = self.panels[i]._series[s].title + " [OPEN]: " + formatRate(self.panels[i]._series[s].data[point]["open"]);
			legendLines[legendLines.length] = self.panels[i]._series[s].title + " [HIGH]: " + formatRate(self.panels[i]._series[s].data[point]["high"]);
			legendLines[legendLines.length] = self.panels[i]._series[s].title + " [LOW]: " + formatRate(self.panels[i]._series[s].data[point]["low"]);
			legendLines[legendLines.length] = self.panels[i]._series[s].title + " [CLOSE]: " + formatRate(self.panels[i]._series[s].data[point]["close"]);
			legendLines[legendLines.length] = self.panels[i]._series[s].title + " [DATE]: " + self.panels[i]._series[s].data[point]["date"];
		}

		for (var s=0; s < self.panels[i]._indicators.length; s++) {
			
			for (var j=0; j < self.panels[i]._indicators[s]._indicator._series.length; j++) {
				legendLines[legendLines.length] = self.panels[i]._indicators[s]._indicator._series[j].title + ": " + formatRate(self.panels[i]._indicators[s]._indicator._data[j][point]);
			}
		}
		
		boxBlend(imageData, 10, 10, 210, (legendLines.length * 15) + 10, 25, 25, 25, 60);// 0xFF);
		for (var s=0; s < legendLines.length; s++) {
			rasterText(imageData, legendLines[s] , 12, 15 * (s+1));
		}
		
		
		// copy the image data back onto the canvas
		context.putImageData(imageData, 0, 0);
		
		legendLines = [];
	}
	
};

Rocketchart.prototype.clearHUD = function(){
	
	for (var i=0; i < this.panelOverlays.length; i++) {

		// This clears the canvas:
		var context = this.panelOverlays[i].getContext("2d");
		context.clearRect(0,0,this.panelOverlays[i].width,this.panelOverlays[i].height);
		
		// Hacky way, slower except in earlier canvas implementations:
		//this.panelOverlays[i].setAttribute("width", this.panelOverlays[i].width);
		
	}
	
};

/**
 * Adds a canvas to our root element and tracks it in our panels array
 * @alias				rocketcharts.addPanel()
 * @return	{int}		The ID of the panel that was added
 * @method
 */
Rocketchart.prototype.addPanel = function(){
	
	var calcHeight = 0;
	var calcY = 0;
	
	var panelID = this.panels.length;
	var panelHeightPercent = 1 / (panelID + 1);
	var actualHeight = panelHeightPercent * this.element.height();
	
	if (actualHeight < this.settings.minimumPanelHeight) {
		actualHeight = this.settings.minimumPanelHeight;
	}
	
	var panelsElement = $("#panels", this.element);
	
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
	this.panels[panelID] = new Rocketpanel($('#panel' + panelID, this.element).get(0), actualHeight, this);
	
	panelsElement.append('<canvas style="padding: 0px; margin: 0px; z-index: 1; position: absolute; left: 0px; top: ' + calcY + 'px;" id="panelOverlay' + panelID + '" width="' + (this.element.width() - 20) + '" height="' + actualHeight + '">rocketchart panel</canvas>');
	this.panelOverlays[panelID] = $("#panelOverlay" + panelID, this.element).get(0);
	
	return panelID;
};

Rocketchart.prototype.options = function() {
	
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
Rocketchart.prototype.addSeries = function(title, data, type, style, panel){
	var self = this;
	var panelID = -1;
	var panelHeight = -1;

	panelID = panel || self.addPanel();
	
	if (data === undefined){
		data = GeneratePriceHistory();
	} else {
		// TODO: Verify the integrity of the data before blindly accepting it. 
	}

	type = type || 'candlesticks';// Default to candlesticks

	// Keep track of all series data in a root array for quick lookups
	self.data.push({title: title, data: data});
	self.panels[panelID].addSeries(new Rocketseries(self.data[self.data.length - 1].data, type, title, style, self));
	
	self.view.startingPoint = Math.round(data.length / 2);
	self.view.endingPoint = data.length;
	
	self.draw();
};

/**
 * Adds a new indicator to the chart
 * @alias				rocketcharts.addIndicator(id, params, series, panel)
 * @param	{string}	id		The string identifier of the indicator to add, i.e. 'simplemovingaverage'
 * @param	{Array}		params	The array of user-supplied parameters specific to the indicator
 * @param	{int}		series	The id of the series' data we want to calculate this indicator from
 * @param	{int}		panel	the id of the panel to add this series to, if undefined, we create a new panel
 * @return	{int}		The ID in the indicatorIndex that points to this indicator
 * @method
 */
Rocketchart.prototype.addIndicator = function(id, params, series, panel){

	var panelID = -1;
	var indicatorID = -1;
	
	if ((panel == undefined) || (panel == -1)){
		panelID = this.addPanel();
	} else {
		panelID = panel;
	}
	
	if (series == undefined) {
		series = 0;
	}
	
	indicatorID = this.panels[panelID].addIndicator(new Rocketindicator(this, id, this.data[series].data, params));
	this.indicatorIndex[this.indicatorIndex.length] = {panel: panelID, indicator: indicatorID};
	this.refreshPanels();
	this.draw();
	
	return (this.indicatorIndex.length - 1);
};

Rocketchart.prototype.removeIndicator = function(id) {
	this.panels[this.indicatorIndex[id].panel]._indicators.splice(this.indicatorIndex[id].indicator, 1);
	this.indicatorIndex.splice(id, 1);
	
	this.refreshPanels();
	this.draw();
};

Rocketchart.prototype.refreshPanels = function() {
	var self = this,
		i = 0,
		simpleHeight = 0;
	
	// Check panels:
	for (i=0; i < self.panels.length; i++) {

		// Remove if empty:
		if ((self.panels[i]._series.length == 0) && (self.panels[i]._indicators.length == 0)) {
			$(self.panels[i]._canvas).remove();
			$(self.panelOverlays[i]).remove();
			
			self.panels.splice(i, 1);
			self.panelOverlays.splice(i, 1);
			
			// Set the iterator back one to account for the shift taking place in the arrays
			i--;
		}
	}
	
	// Resize panels:
	simpleHeight = Math.floor(self.element.height() / self.panels.length) - 1;
	
	if (simpleHeight < this.settings.minimumPanelHeight) {
		simpleHeight = this.settings.minimumPanelHeight;
	}
	
	for (i=0; i < self.panels.length; i++) {

		// update the width and height of the canvas
		self.panels[i]._canvas.setAttribute("height", simpleHeight);
		self.panels[i]._canvas.style.top = simpleHeight * i;
		
		self.panelOverlays[i].setAttribute("height", simpleHeight);
		self.panelOverlays[i].style.top = simpleHeight * i;
		
	}
}


/**
 * Beginning of a chain of function calls to draw chart - creates image data for each canvas
 * we are tracking, in turn passes that imageData to each panel in our array for drawing 
 * @alias				rocketcharts.draw()
 * @return	{void}
 * @method
 */
Rocketchart.prototype.draw = function(){
	var self = this;
	var height = 0;
	
	var displayedPoints = self.view.endingPoint - self.view.startingPoint;
	var dateAxisWidth = self.width - self.priceAxisWidth;
	self.view.horizontalPixelsPerPoint = dateAxisWidth / displayedPoints;
	self.view.halfHorizontalPixelsPerPoint = Math.round(self.view.horizontalPixelsPerPoint / 2.0) - 1;
	
	// Draw panels:
	for (var i=0; i < self.panels.length; i++) {
		
		// grab the datacontext of the canvas
		var context = self.panels[i]._canvas.getContext("2d");
		
		// read the height of the canvas
		height = parseInt(self.panels[i]._canvas.getAttribute("height"));
		
		if (self.settings.debug) {
			console.log("draw called, width: " + self.width + " height: " + height);
		}

		// create a new pixel array
		var imageData = context.createImageData(self.width, height);
		
		self.panels[i].draw(imageData, self.width - self.priceAxisWidth);
		
		// copy the image data back onto the canvas
		context.putImageData(imageData, 0, 0);
	}
	
	// Draw date axis:
	var context = self.dateAxisCanvas.getContext("2d");
	var imageData = context.createImageData(self.width, 15);
	
	// Take the last date string, calculate it's width in pixels
	// TODO: Perhaps calculate the average length to avoid one-off long or short strings?
	var averageDateSpace = (self.data[0].data[displayedPoints - 1].date.length * 6) + 20;
	
	var minorStep = 4;
	var majorStep = Math.ceil(averageDateSpace / (minorStep * self.view.horizontalPixelsPerPoint));
	
	var k = 0;
	var tickCount = 0;
	
	for (var i=1; i < displayedPoints; i++) {
		
		if (i % minorStep == 0) {
			k = (i * self.view.horizontalPixelsPerPoint) + self.view.halfHorizontalPixelsPerPoint;
			line(imageData, k, 0, k, 1, 100, 100, 100, 0xFF);
			tickCount++;
			
			if (tickCount % majorStep == 0) {
				//k = i * horizontalPixelsPerPoint;
				line(imageData, k, 0, k, 3, 255,255,255, 0xFF);
				//rasterText(imageData, this.data[0].data[i].date, k - 60, 6);
				rasterText(imageData, self.data[0].data[self.view.startingPoint + i].date, k - (averageDateSpace / 2) + 10, 6);
			}
		}
		
		
		
	}
	
	context.putImageData(imageData, 0, 0);

};

/**
 * Utility function exposed to indicators allowing quick calculation of an SMA on any dataset
 * @alias				Rocketindicatorcalculations.calculateSMA(periods, data);
 * @param	{int}		periods
 * @param	{Array}		data	The array of data to calculate SMA from...
 * @return	{Array}
 * @method
 */
Rocketchart.prototype.calculateSMA = function(periods, data) {
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
};


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
function Rocketseries(data, type, title, style, rocketchart){
	this.data = data;
	this.type = type;
	this.title = title;
	this.style = style || {};
	this.rocketchart = rocketchart;

	this.style.UpColor =  this.style.UpColor || rocketchart.settings.defaultUpColor;
	this.style.DownColor =  this.style.DownColor || rocketchart.settings.defaultDownColor;
	
	return true;
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
Rocketseries.prototype.draw = function(imageData, verticalPixelPerPoint, gridMin, w, h){
	this[this.type].apply(this, arguments);//type === function name.  apply passes all the same arguments.
};

Rocketseries.prototype.candlesticks = function(imageData, verticalPixelPerPoint, gridMin, w, h){
	
	var yCloseOld = 0;
	
	var valueOpen;
	var valueHigh;
	var valueLow;
	var valueClose;
	
	var yvalueOpen;
	var yvalueHigh;
	var yvalueLow;
	var yvalueClose;
	
	var horizSpacing = this.rocketchart.view.horizontalPixelsPerPoint;
	var halfhorizSpacing = this.rocketchart.view.halfHorizontalPixelsPerPoint;
	var lineAreaStart = h;
	var X = halfhorizSpacing;
	
	var i = 0;
	
	for (i = this.rocketchart.view.startingPoint; i < this.rocketchart.view.endingPoint; i++) //dataCount
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
};

function Rocketpanel(canvas, height, rocketchart){
	this._canvas = canvas;
	this._gridMax = -100000;
	this._gridMin = 100000;
	this._series = [];
	this._indicators = [];
	this._height = 0;
	this._verticalPixelsPerPoint = 0;
	this._userHeight = height || .50;// Default to 50% - the formula is: if userHeight <= 1, it's percentage, else it's pixels
	this.rocketchart = rocketchart;
	return true;
}

Rocketpanel.prototype.draw = function(imageData, w){

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
	}
	
	var legendLines = [];

	// Draw series
	for (var i=0; i < this._series.length; i++) {
		this._series[i].draw(imageData, this._verticalPixelsPerPoint, this._gridMin, w, this._height);
		legendLines.push(this._series[i].title);
	}
	
	// Draw indicators
	for (var i=0; i < this._indicators.length; i++) {
		this._indicators[i].draw(imageData, this._verticalPixelsPerPoint, this._gridMin, w, this._height);
		
		for (var j=0; j < this._indicators[i]._indicator._series.length; j++) {
			legendLines.push(this._indicators[i]._indicator._series[j].title);
		}
	}
	
	boxBlend(imageData, 10, 10, 210, (legendLines.length * 15) + 10, 25, 25, 25, 60);// 0xFF);
	for (var i=0; i < legendLines.length; i++) {
		rasterText(imageData, legendLines[i] , 12, 15 * (i+1));
	}
	
};

Rocketpanel.prototype.addSeries = function(series){
	this._series.push(series);
};

Rocketpanel.prototype.addIndicator = function(indicator){
	this._indicators.push(indicator);
	return (this._indicators.length - 1);
};

Rocketpanel.prototype.calculate = function(){
	this._height = $(this._canvas).attr("height");
	this._gridMax = -100000;
	this._gridMin = 100000;
	
	var value = 0;
	
	for (var i=0; i < this._series.length; i++)
	{
		//var len = this._series[i].data.length; //_sizing.StartingTick + _sizing.VisibleTicks;
		//var startValue = 0;//_sizing.StartingTick;
		
		for (var j = this.rocketchart.view.startingPoint; j < this.rocketchart.view.endingPoint; j++)
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
			
			for (var k = this.rocketchart.view.startingPoint; k < this.rocketchart.view.endingPoint; k++){
				value = this._indicators[i]._indicator._data[j][k];
				
				if (value != null) {
					if (value > this._gridMax)
						this._gridMax = value;
						
					if (value < this._gridMin)
						this._gridMin = value;
				}
			}
		}
	}
	
	this._gridStep = (this._gridMax - this._gridMin) / 10;
	this._gridMin -= (this._gridStep * .25);
	this._gridMax += (this._gridStep * .25);
	this._gridStep = (this._gridMax - this._gridMin) / 10;
	
	this._verticalPixelsPerPoint = this._height / (this._gridMax - this._gridMin);
	
	if (this.rocketchart.settings.debug) {
		console.log("Calculate called, _height: " + this._height + ", _verticalPixelsPerPoint: " + this._verticalPixelsPerPoint)
	}
};

// id = lookup in public indicator array
function Rocketindicator(rocketchart, id, data, params, series){
	// lookup the right function (object) to create based on the id and pass it the data
	var calc = new Rocketindicatorcalculations();
	this.rocketchart = rocketchart;
	this._indicator = new calc[id](data, params, series);
	
	// TODO: Better lookup?
	for(var i=0; i<rocketchart.indicators.length; i++) {
		if (rocketchart.indicators[i].id == id) {
			this.name = rocketchart.indicators[i].name;
			break;
		}
	}
}

Rocketindicator.prototype.draw = function(imageData, verticalPixelPerPoint, gridMin, w, h){
	for(var i=0; i<this._indicator._series.length; i++){
		this[this._indicator._series[i].type](imageData, verticalPixelPerPoint, gridMin, w, h, i);
	}
	
	var yValue = 0;
	
	if (this._indicator._constantLines != undefined) {
		for (var i=0; i<this._indicator._constantLines.length; i++) {
			yValue = h - (verticalPixelPerPoint * (this._indicator._constantLines[i].value - gridMin));
			line(imageData, 0, yValue, w, yValue, 255, 255, 255, 255, 1);
		}
	}
};

Rocketindicator.prototype.line = function(imageData, verticalPixelPerPoint, gridMin, w, h, s){
	var indicatorData = this._indicator._data;
	var seriesLength = 0;
	var lastValue = 0;
	var lastValueOld = 0;
	var i = 0;
	
	var horizSpacing = this.rocketchart.view.horizontalPixelsPerPoint;
	var halfhorizSpacing = this.rocketchart.view.halfHorizontalPixelsPerPoint;
	var barHeight = 0;
	var X = halfhorizSpacing;
	var smoothing = false; //Preferences.EnableSmoothing;
	
	seriesLength = indicatorData[s].length;
	
	var seriesColor = hexToRgb(intToHex(this._indicator._series[s].color));
	
	// ENSURE COLOR is 100% ALPHA:
	/*
	var c = indicator.seriesColor(s);
	var r1:uint= ((c & 0x00FF0000) >> 16);
	var g1:uint= ((c & 0x0000FF00) >> 8);
	var b1:uint= ((c & 0x000000FF));
	var ac:Number=0xFF;
	var n:uint=(ac<<24)+(r1<<16)+(g1<<8)+b1;
	*/
	
	for (i = this.rocketchart.view.startingPoint; i < this.rocketchart.view.endingPoint; i++)
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
					line(imageData, X - horizSpacing, lastValueOld, X, lastValue, seriesColor.r, seriesColor.g, seriesColor.b, 255, 2);
				}
				lastValue = h - (verticalPixelPerPoint * (indicatorData[s][i] - gridMin));							
			}

			lastValueOld = lastValue;
		}
		
		X += horizSpacing;
	}
};

Rocketindicator.prototype.dot = function(imageData, verticalPixelPerPoint, gridMin, w, h, s){
	var indicatorData = this._indicator._data;
	var seriesLength = 0;
	var lastValue = 0;
	var lastValueOld = 0;
	var i = 0;
	
	var horizSpacing = this.rocketchart.view.horizontalPixelsPerPoint;
	var halfhorizSpacing = this.rocketchart.view.halfHorizontalPixelsPerPoint;
	
	var X = halfhorizSpacing;
	
	seriesLength = indicatorData[s].length;
	var seriesColor = hexToRgb(intToHex(this._indicator._series[s].color));
	
	for (i = this.rocketchart.view.startingPoint; i < this.rocketchart.view.endingPoint; i++)
	{
		if (indicatorData[s][i] != null)
		{
			lastValue = h - (verticalPixelPerPoint * (indicatorData[s][i] - gridMin));
			box(imageData, X - 1, lastValue - 1, X, lastValue, seriesColor.r, seriesColor.g, seriesColor.b, 255);
		}
		
		X += horizSpacing;
	}
};

Rocketindicator.prototype.histogram = function(imageData, verticalPixelPerPoint, gridMin, w, h, s){
	var indicatorData = this._indicator._data;
	var seriesCount = indicatorData.length;
	var seriesLength = 0;
	var lastValue = 0;
	var i = 0;
	var x = 0;
	var horizSpacing = this.rocketchart.view.horizontalPixelsPerPoint;
	var halfhorizSpacing = this.rocketchart.view.halfHorizontalPixelsPerPoint;
	var barHeight = 0;
	var counter = halfhorizSpacing;
	
	var smoothing = false; //Preferences.EnableSmoothing;
	
	seriesLength = indicatorData[s].length;
	var seriesColor = hexToRgb(intToHex(this._indicator._series[s].color));
	
	// ENSURE COLOR is 100% ALPHA:
	/*
	var c = indicator.seriesColor(s);
	var r1:uint= ((c & 0x00FF0000) >> 16);
	var g1:uint= ((c & 0x0000FF00) >> 8);
	var b1:uint= ((c & 0x000000FF));
	var ac:Number=0xFF;
	var n:uint=(ac<<24)+(r1<<16)+(g1<<8)+b1;
	*/
	
	for (i = this.rocketchart.view.startingPoint; i < this.rocketchart.view.endingPoint; i++)
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
				 	seriesColor.r, seriesColor.g, seriesColor.b,
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
				 	seriesColor.r, seriesColor.g, seriesColor.b,
				 	0xFF, 
				 	false);
			}
		}
		
		counter += horizSpacing;
	}
};

/**
 * Create a new framework of utility functions.
 * @classDescription			Creates a new framework of utility functions.
 * @type	{Object}
 * @return	{Boolean}		Returns true.
 * @constructor
 */
function Rocketindicatorcalculations() {
	
	return true;
}


/**
 * Accept an array of OHLC data and an array of parameters, then performs the simple moving average calculation.
 * @alias				MHUtils.objConvert(arr)
 * @param	{Array}		data	The array of OHLC data
 * @param	{Array}		params	The array of user-supplied parameters
 * @return	{Object}			Returns the indicator data
 * @method
 */
Rocketindicatorcalculations.prototype.simplemovingaverage = function (data, params, series) {
	this._params = params;
	this._series = series;
	this._sourceData = data;
	this._data = [];
	
	this._series = this._series || [{type: 'line', title: "SMA", color: 0xFF0000}];
	this._params = this._params || [{name: 'Periods', type: 'numeric', value: 9, step: 1, min: 1, max: 100}];
	
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
	};
	
	this.calculate();
};

Rocketindicatorcalculations.prototype.weightedmovingaverage = function (data, params, series) {
	this._params = params;
	this._series = series;
	this._sourceData = data;
	this._data = [];

	this._series = this._series || [{type: 'line', title: "WMA", color: 0xFF0000}];
	this._params = this._params || [{name: 'Periods', type: 'numeric', value: 9, min: 2, max: 200, step: 1}];

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
	};
	
	this.calculate();
};

Rocketindicatorcalculations.prototype.movingaverageconvergencedivergence = function (data, params, series) {
	this._params = params;
	this._series = series;
	this._sourceData = data;
	this._data = [];


	this._series = this._series || [
		{type: 'histogram', title: "MACD Histogram", color: 0xFF0000},
		{type: 'line', title: "MACD Trigger", color: 0xFFFFFF},
		{type: 'line', title: "MACD", color: 0x666666}
	];

	this._params = this._params || [
		{name: 'Slow EMA Periods', type: 'numeric', value: 9, step: 1, min: 1, max: 100},
		{name: 'Fast EMA Periods', type: 'numeric', value: 12, step: 1, min: 1, max: 100},
		{name: 'Trigger EMA Periods', type: 'numeric', value: 9, step: 1, min: 1, max: 100}
	];

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
	};
	
	this.calculate = function(){
		if (this._sourceData != null) {
			var i = 0;
			var closeArray = [];
			var MACDValues = [];
			var count = this._sourceData.length;
			
			for (i = 0; i < count; i++){
				closeArray[i] = this._sourceData[i]["close"];
			}
			
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
	};
	
	this.calculate();
};

Rocketindicatorcalculations.prototype.bollingerbands = function (data, params, series) {
	this._params = params;
	this._series = series;
	this._sourceData = data;
	this._data = [];

	this._series = this._series || [
		{type: 'line', title: "BB Upper", color: 0xFFFFFF},
		{type: 'line', title: "BB Middle", color: 0xFFFFFF},
		{type: 'line', title: "BB Lower", color: 0xFFFFFF}
	];

	this._params = this._params || [
		{name: 'Periods', type: 'numeric', value: 9, step: 1, min: 1, max: 100},
		{name: 'Standard Deviations', type: 'numeric', value: 2, step: 1, min: 1, max: 100}
	];

	this.calculate = function(){
		if (this._sourceData != null) {
			var total = 0;
			var totalDeviation = 0;
			var deviation = 0;
			var j = 0;
			var count = this._sourceData.length;
			
			var upper = [];
			var smaValues = [];
			var lower = [];
			
			
			for (j = 0; j<this._params[0].value; j++)
			{
				upper[j] = null;
				smaValues[j] = null;
				lower[j] = null;
			}
			
			for (var i = this._params[0].value - 1; i < count; i++)
			{
				// Calculate SMA:
				for (j = 0; j < this._params[0].value; j++)
				{
					total += this._sourceData[i - j]["close"];
				}
				
				smaValues[i] = total / this._params[0].value;
				
				// Calculate Deviation:
				for (j = 0; j < this._params[0].value; j++)
				{
					totalDeviation += Math.pow((this._sourceData[i - j]["close"] - smaValues[i]), 2);
				}
				
				deviation = Math.sqrt(totalDeviation / this._params[0].value);
				
				upper[i] = smaValues[i] + (deviation * this._params[1].value);
				lower[i] = smaValues[i] - (deviation * this._params[1].value);
				
				total = 0;
				totalDeviation = 0;
			}
			
			this._data[0] = upper;
			this._data[1] = smaValues;
			this._data[2] = lower;
		}
	};
	
	this.calculate();
};

Rocketindicatorcalculations.prototype.stochasticfast = function (data, params, series) {
	this._params = params;
	this._series = series;
	this._sourceData = data;
	this._data = [];

	this._series = this._series || [
		{type: 'line', title: "SO Fast %K - " + this._params[0].value, color: 0xFF0000},
		{type: 'line', title: "SO Fast %D - 3", color: 0x999999}
	];

	this._params = this._params || [
		{name: 'Periods', type: 'int', value: 14},
		{name: 'Overbought Guideline', type: 'numeric', value: 80, step: 1, min: 50, max: 100}, // TODO: Add min, max, step values
		{name: 'Oversold Guideline', type: 'numeric', value: 20, step: 1, min: 0, max: 50}
	];

	this._constantLines = this._constantLines || [
		{value: this._params[1].value, color: 0xFFFFFF},
		{value: this._params[2].value, color: 0xFFFFFF}
	];

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
	};
	
	this.calculate();
};

Rocketindicatorcalculations.prototype.parabolicsar = function (data, params, series) {
	this._params = params;
	this._series = series;
	this._sourceData = data;
	this._data = [];

	this._series = this._series || [
		{type: 'dot', title: "SAR", color: 0xFF0000}
	];

	this._params = this._params || [
		{name: 'Acceleration', type: 'numeric', value: 0.02, step: 0.01, min: 0.01, max: 1.0},
		{name: 'Acceleration Ceiling', type: 'numeric', value: 0.2, step: 0.1, min: 0.1, max: 10}
	];
	
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
	};
	
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
var fontPoints = [[{x:3, y:0}, {x:3, y:1}, {x:3, y:2}, {x:3, y:3}, {x:3, y:5}, {x:3, y:6}],
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
			characterPixelLength = fontPoints[code].length;
			
			for (var j=0; j < characterPixelLength; j++) {
				setPixel(imageData,
						 startX + fontPoints[code][j].x,
						 startY + fontPoints[code][j].y,
						 255, 255, 255, 0xFF);
			}
		}
		
		startX += 6;
	}
}

function randomInRange(minVal,maxVal) {
  var randVal = minVal+(Math.random()*(maxVal-minVal));
  return randVal;
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

function intToHex(i) {  
    var hex = parseInt(i).toString(16);  
    return (hex.length < 2) ? "0" + hex : hex;  
}  

function formatRate(value) {
	return !!value ? value.toFixed(4) : "";
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