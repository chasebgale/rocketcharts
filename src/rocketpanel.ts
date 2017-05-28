class Rocketpanel {
	private canvas: HTMLCanvasElement;
	private min: number 		= -100000;
	private max: number 		= 100000;
	private height: number 	= 0;
	private series: Rocketseries;
	private indicators: Rocketseries[];

	constructor(private element: HTMLElement, private options: Options) {
		this.canvas = document.createElement('canvas') as HTMLCanvasElement;
    this.canvas.setAttribute('width', '400');
    this.canvas.setAttribute('height', '225');
    this.element.appendChild(this.canvas);
	}

	public Calculate() {
		this.height = parseInt(this.canvas.getAttribute('height'));
		this.max 		= -100000;
		this.min 		= 100000;

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
	}
}