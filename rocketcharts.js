/**
 * Base class, keeps track of our panels, settings, metrics and data, also exposes indicator enum
 * @alias				rocketcharts
 * @return	{bool}
 * @method
 */
function rocketchart() {
	this.panels = new Array();
	this.data = new Array();
	this.element;
	this.indicators = [{name: 'Simple Moving Average', id: 'simplemovingaverage'},
					   {name: 'Weighted Moving Average', id: 'weightedmovingaverage'},
					   {name: 'Moving Average Convergance/Divergance', id: 'movingaverageconvergancedivergance'}]
					   
	this.priceAxisWidth = 75;
					   
	var settings = new Object();
	settings.minimumPanelHeight = 200; 
	settings.defaultUpColor = "#00EAFF";
	settings.defaultDownColor = "#005F6B";
	this.settings = settings;
	
	var view = new Object();
	view.horizontalPixelsPerPoint = 0;
	view.startingPoint = 0;
	view.visiblePoints = -1;
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
	
	this.element.append("<div id=\"panels\" style=\"height: 100%; width: " + this.width + "px;\"></div>");
	var panelsElement = $("#panels");
	
	panelsElement.css("overflow", "auto");
	panelsElement.css("margin", "0px");
	panelsElement.css("padding", "0px");
	
	this.element.bind( "resize", function(event, ui) {
		rocketcharts.resize(ui.size.width, ui.size.height);
		rocketcharts.draw();
	});
	this.element.bind("mousedown", function(event, ui) {
		$(this).bind( "mousemove", function(event, ui) {
			rocketcharts.headsUpDisplay(event.offsetX, event.offsetY);
			rocketcharts.draw();
		});
		this.style.cursor = 'crosshair';
		rocketcharts.headsUpDisplay(event.offsetX, event.offsetY);
		rocketcharts.draw();
		return false; // Prevents browser from changing cursor to 'I-Beam', thinking we are trying to select text
	});
	this.element.bind("mouseup", function(event, ui) {
		$(this).unbind( "mousemove" );
		this.style.cursor = 'default';
		rocketcharts.mouseDown = false;
		rocketcharts.HUD = false;
		rocketcharts.draw();
	});
	
	// TODO: Instead of doing this, merge the settings argument with this.settings
	// i.e. if a settings object was passed with only the property 'resizable' set, just that
	// parameter should be updated in the global object
	if (settings != undefined) {
		
	}
	
	this.settings.defaultUpColor = hexToRgb(this.settings.defaultUpColor);
	this.settings.defaultDownColor = hexToRgb(this.settings.defaultDownColor);
	
	if (this.settings.resizable)
		this.element.resizable();
		
	if ((this.settings.customUI == false) || (this.settings.customUI == undefined)) {
		// Add our windows for chart management:
		GenerateDialogs(this.element, this.indicators);
	}
	
	// Experimental: Floating Date Axis
	this.element.append("<div style=\"height: 15px; width: " + this.width + "px;\">" +
							"<canvas id=\"dateAxisCanvas\" width=\"" + this.width + "\" height=\"15\"></canvas>" +
						"</div>");
	
	this.dateAxisCanvas = document.getElementById("dateAxisCanvas");
	
	// Experimental: Raster Text
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
	
	var calcHeight = 0;
	
	for (var i=0; i < this.panels.length; i++) {
		
		if (this.panels[i]._userHeight <= 1){
			calcHeight = this.panels[i]._userHeight * h;
		} else {
			calcHeight = this.panels[i]._userHeight;
		}
				
		// update the width and height of the canvas
		this.panels[i]._canvas.setAttribute("width", w);
		this.panels[i]._canvas.setAttribute("height", calcHeight);
		
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
	
	// For now displayedPoints = all ticks, in the future whatever zoom or view we have set
	var displayedPoints = this.data[0].data.length; 
	var horizontalPixelsPerPoint = dateAxisWidth / displayedPoints;
	
	var point = -1;
	
	if (x > dateAxisWidth) {
		// flag the removal of info box
		this.HUD = false;
	} else {
		this.HUD = true;
		point = Math.floor(x / horizontalPixelsPerPoint);
		this.HUDPoint = point;
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
	
	var panelID = this.panels.length;
	var panelHeightPercent = 1 / (panelID + 1);
	var actualHeight = panelHeightPercent * this.element.height();
	
	if (actualHeight < this.settings.minimumPanelHeight) {
		actualHeight = this.settings.minimumPanelHeight;
	}
	
	var panelsElement = $("#panels");
	
	// this.element.append
	panelsElement.append('<canvas style="padding: 0px; margin: 0px;" id="panel' + panelID + '" width="' + (this.element.width() - 20) + '" height="' + actualHeight + '">rocketchart panel</canvas>');
	this.panels[panelID] = new rocketpanel(document.getElementById("panel" + panelID), actualHeight);
	
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
		
	}
	
	return panelID;
}

/**
 * Adds a new primary series to the chart
 * @alias				rocketcharts.addSeries(title, data, type, panel)
 * @param	{string}	title		The string identifier for this series		
 * @param	{Array}		data		Array of {Object}s with the properties: Open, High, Low, Close, Date
 * @param	{int}		type		Enum identifier describing chart type		
 * @param	{int}		panel		ID of the panel to add the series to
 * @return	{void}
 * @method
 */
rocketchart.prototype.addSeries = function(title, data, type, panel){

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
	this.panels[panelID].addSeries(new rocketseries(this.data[this.data.length - 1].data, type, title));
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
	var dateAxisWidth = this.width - this.priceAxisWidth;
	
	// For now displayedPoints = all ticks, in the future whatever zoom or view we have set
	var displayedPoints = this.data[0].data.length; 
	var horizontalPixelsPerPoint = dateAxisWidth / displayedPoints;
	//var step = Math.floor(displayedPoints / Math.floor(dateAxisWidth / 150));
	//var minorStep = Math.floor(step / 10); //Math.ceil(displayedPoints / (dateAxisWidth / 5));
	
	var minorStep = 4;
	var majorStep = Math.ceil(150 / (minorStep * horizontalPixelsPerPoint));
	
	var k = 0;
	var tickCount = 0;
	
	for (var i=1; i < displayedPoints; i++) {
		
		if (i % minorStep == 0) {
			k = i * horizontalPixelsPerPoint;
			line(imageData, k, 0, k, 1, 100, 100, 100, 0xFF);
			tickCount++;
			
			if (tickCount % majorStep == 0) {
				//k = i * horizontalPixelsPerPoint;
				line(imageData, k, 0, k, 3, 255,255,255, 0xFF);
				rasterText(imageData, this.data[0].data[i].date, k - 60, 6);
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
 * @return	{bool}
 * @method
 */
function rocketseries(data, type, title){
	this.data = data;
	this.type = type;
	this.title = title;
	
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
	var X = 1;
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
	var horizSpacing = w / this.data.length; //(unscaledWidth - _priceAxis.axisWidth) / _sizing.VisibleTicks;    _sizing.HorizontalPixelsPerPoint;
	var halfhorizSpacing = Math.round(horizSpacing / 2.0) - 1;
	var lineAreaStart = h;
	
	if (startTick < 0)
		startTick = 0;
	
	var dataCount = this.data.length; //_sizing.StartingTick + _sizing.VisibleTicks;
	
	//if (dataCount > _dataSource.length)
	//	dataCount = _dataSource.length;
	
	var i = 0;
	
	for (i = startTick; i < dataCount; i++) //dataCount
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
				line(imageData, X, yvalueHigh, X, yvalueLow, rocketcharts.settings.defaultUpColor.r, rocketcharts.settings.defaultUpColor.g, rocketcharts.settings.defaultUpColor.b, 0xff);
				box(imageData, X-halfhorizSpacing, yvalueClose, X+halfhorizSpacing, yvalueOpen, rocketcharts.settings.defaultUpColor.r, rocketcharts.settings.defaultUpColor.g, rocketcharts.settings.defaultUpColor.b, 0xff, false);
			}
			else
			{
				line(imageData, X, yvalueHigh, X, yvalueLow, rocketcharts.settings.defaultDownColor.r, rocketcharts.settings.defaultDownColor.g, rocketcharts.settings.defaultDownColor.b, 0xff);
				box(imageData, X-halfhorizSpacing, yvalueOpen, X+halfhorizSpacing, yvalueClose, rocketcharts.settings.defaultDownColor.r, rocketcharts.settings.defaultDownColor.g, rocketcharts.settings.defaultDownColor.b, 0xff, false);
			}
		}
		
		X += horizSpacing;
		
	}
}

function rocketpanel(canvas, height){
	this._canvas = canvas;
	this._gridMax = -100000;
	this._gridMin = 100000;
	this._series = new Array();
	this._indicators = new Array();
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
		valueAtPoint = ((i * this._gridStep) - this._gridMin);
		rasterText(imageData, valueAtPoint.toFixed(4), w + 5, yValue - 3);
		line(imageData, w, yValue, w + 3, yValue, 255,255,255,0xFF);
		
		if ((i % 2) == 0) {
			box(imageData, 0, yValue, w, oldY, 45, 45, 45, 0xFF);
		}
		
		oldY = yValue;
	};
	
	var legendLines = new Array();
	var legendPoint = rocketcharts.data[0].data.length - 1;
	
	// Draw HUD Line
	if (rocketcharts.HUD) {
		legendPoint = rocketcharts.HUDPoint;
		var horizSpacing = w / rocketcharts.data[0].data.length;
		var halfhorizSpacing = Math.round(horizSpacing / 2.0) - 1;
		var x = (rocketcharts.HUDPoint * horizSpacing) + halfhorizSpacing;
		line(imageData, x, 0, x, this._canvas.height, 255, 255, 255, 0xFF);
	}
	
	// Draw series
	for (var i=0; i < this._series.length; i++) {
		this._series[i].draw(imageData, this._verticalPixelsPerPoint, this._gridMin, w, this._height);

		if (rocketcharts.HUD) {
			legendLines[legendLines.length] = this._series[i].title + " [OPEN]: " + formatRate(this._series[i].data[legendPoint]["open"]);
			legendLines[legendLines.length] = this._series[i].title + " [HIGH]: " + formatRate(this._series[i].data[legendPoint]["high"]);
			legendLines[legendLines.length] = this._series[i].title + " [LOW]: " + formatRate(this._series[i].data[legendPoint]["low"]);
			legendLines[legendLines.length] = this._series[i].title + " [CLOSE]: " + formatRate(this._series[i].data[legendPoint]["close"]);
			legendLines[legendLines.length] = this._series[i].title + " [DATE]: " + this._series[i].data[legendPoint]["date"];
		} else {
			legendLines[legendLines.length] = this._series[i].title;
		}
	};
	
	// Draw indicators
	for (var i=0; i < this._indicators.length; i++) {
		this._indicators[i].draw(imageData, this._verticalPixelsPerPoint, this._gridMin, w, this._height);
		
		for (var j=0; j < this._indicators[i]._indicator._series.length; j++) {
			if (rocketcharts.HUD) {
				legendLines[legendLines.length] = this._indicators[i]._indicator._series[j].title + ": " + formatRate(this._indicators[i]._indicator._data[j][legendPoint]);
			} else {
				legendLines[legendLines.length] = this._indicators[i]._indicator._series[j].title;	
			}
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
		var len = this._series[i].data.length; //_sizing.StartingTick + _sizing.VisibleTicks;
		var startValue = 0;//_sizing.StartingTick;
		
		for (var j = startValue; j < len; j++)
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
			
			var len = this._indicators[i]._indicator._data[j].length; //_sizing.StartingTick + _sizing.VisibleTicks;
			var startValue = 0;//_sizing.StartingTick;
			
			for (var k = startValue; k < len; k++){
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
function rocketindicator(id, data, params){
	// lookup the right function (object) to create based on the id and pass it the data
	var calc = new rocketindicatorcalculations();
	this._indicator = new calc[id](data, params);
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
		}
	}
}

rocketindicator.prototype.drawLine = function(imageData, verticalPixelPerPoint, gridMin, w, h, s){
	var indicatorData = this._indicator._data;
	var seriesLength = 0;
	var lastValue = 0;
	var lastValueOld = 0;
	var i = 0;
	var X = 0;
	var horizSpacing = w / this._indicator._sourceData.length;
	var halfhorizSpacing = horizSpacing / 2;
	var barHeight = 0;
	
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
	
	for (i = 0; i < seriesLength; i++)
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

rocketindicator.prototype.drawHistogram = function(imageData, verticalPixelPerPoint, gridMin, w, h, s){
	var indicatorData = this._indicator._data;
	var seriesCount = indicatorData.length;
	var seriesLength = 0;
	var lastValue = 0;
	var i = 0;
	var x = 0;
	var horizSpacing = w / this._indicator._sourceData.length;
	var halfhorizSpacing = horizSpacing / 2;
	var barHeight = 0;
	var counter = 0;
	
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
	
	for (i = 0; i < seriesLength; i++)
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
					(horizSpacing * counter) - halfhorizSpacing + 1, 
				 	h - (verticalPixelPerPoint * (indicatorData[s][i] - gridMin)), 
				 	(horizSpacing * counter) + halfhorizSpacing - 1,
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
					(horizSpacing * counter) - halfhorizSpacing + 1, 
				 	h - (verticalPixelPerPoint * (0 - gridMin)), 
				 	(horizSpacing * counter) + halfhorizSpacing - 1,
				 	h - (verticalPixelPerPoint * (0 - gridMin)) + barHeight, 
				 	190, 
				 	190,
				 	190,
				 	0xFF, 
				 	false);
			}
		}
		
		counter++;
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
	this._data = new Array();
	
	if (this._series == undefined){
		this._series = new Array();
		this._series[0] = {type: rocketseries.seriesType.LINE, title: "SMA", color: 0xFF0000};
	}
	
	if (this._params == undefined){
		// Create default params, will also serve the purpose of declaring the parameters
		this._params = new Array();
		this._params[0] = {name: 'Periods', type: 'int', value: 9};
	}
	
	this.calculate = function(){
		if (this._sourceData != null) {
			var total = 0;
			var j = 0;
			var count = this._sourceData.length;
			this._data = new Array();
			for (var i = 0; i<this._series.length; i++){
				this._data[i] = new Array();
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
	this._data = new Array();
	
	if (this._series == undefined){
		this._series = new Array();
		this._series[0] = {type: rocketseries.seriesType.LINE, title: "WMA", color: 0xFF0000};
	}
	
	if (this._params == undefined){
		// Create default params, will also serve the purpose of declaring the parameters
		this._params = new Array();
		this._params[0] = {name: 'Periods', type: 'int', value: 9, min: 2, max: 200, step: 1};
	}
	
	this.calculate = function(){
		if (this._sourceData != null) {
			var total = 0;
			var j = 0;
			var count = this._sourceData.length;
			var sumofdays = Math.floor((this._params[0].value * (this._params[0].value + 1)) / 2);
			
			this._data = new Array();
			for (var i = 0; i<this._series.length; i++){
				this._data[i] = new Array();
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

rocketindicatorcalculations.prototype.movingaverageconvergancedivergance = function (data, params, series) {
	this._params = params;
	this._series = series;
	this._sourceData = data;
	this._data = new Array();
	
	if (this._series == undefined){
		this._series = new Array();
		this._series[0] = {type: rocketseries.seriesType.HISTOGRAM, title: "MACD Histogram", color: 0xFF0000};
		this._series[1] = {type: rocketseries.seriesType.LINE, title: "MACD Trigger", color: 0xFFFFFF};
		this._series[2] = {type: rocketseries.seriesType.LINE, title: "MACD", color: 0x666666};
	}
	
	if (this._params == undefined){
		// Create default params, will also serve the purpose of declaring the parameters
		this._params = new Array();
		this._params[0] = {name: 'Slow EMA Periods', type: 'int', value: 9};
		this._params[1] = {name: 'Fast EMA Periods', type: 'int', value: 12};
		this._params[2] = {name: 'Trigger EMA Periods', type: 'int', value: 9};
	}
	
	this.calculateEMA = function (data, periods) {
		var returnArray = new Array();
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
			var closeArray = new Array();
			var MACDValues = new Array();
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
			var histogramValues = new Array();
			
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
			
			this._data = new Array();
			for (var i = 0; i<this._series.length; i++){
				this._data[i] = new Array();
			}
			
			this._data[0] = histogramValues;
			this._data[1] = triggerValues;
			this._data[2] = MACDValues;
			
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
    index = (parseInt(x) + parseInt(y) * imageData.width) * 4;
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
    index = (parseInt(x) + parseInt(y) * imageData.width) * 4;
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
					var params = new Array();
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

function formatRate(value) {
	var formattedString = "";
	
	if (value != null) {
		formattedString = value.toFixed(4);
	}
	
	return formattedString;
}

function GeneratePriceHistory(){
	var data = new Array();
	
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