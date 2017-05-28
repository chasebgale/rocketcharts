var Rocketchart = (function () {
    function Rocketchart(element, options) {
        var requisite = {
            CandleWidth: 3,
            CandlePadding: 0.5,
            ColorBackground: '#000000',
            ColorPositive: '#00FF00',
            ColorNegative: '#FF0000',
            ColorNeutral: '#FFFFFF'
        };
        if (!options) {
            this.options = requisite;
        }
        else {
            for (var option in requisite) {
                this.options[option] = this.options[option] ? this.options[option] : requisite[option];
            }
        }
        this.element = typeof element === 'string' ? document.getElementById(element) : element;
    }
    Rocketchart.prototype.Series = function (data, precision) {
        var candleWidth = (this.options.CandleWidth + (this.options.CandlePadding * 2));
        var totalWidth = candleWidth * data.length;
        this.primary = document.createElement('canvas');
        this.primary.setAttribute('width', totalWidth.toString());
        this.primary.setAttribute('height', '200');
        this.element.appendChild(this.primary);
        // grab the datacontext of the canvas
        var context = this.primary.getContext("2d");
        var height = 200;
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
        var lineAreaStart = height;
        var X = halfhorizSpacing;
        for (var i = 0; i < data.length; i++) {
            if (data[i] !== null) {
                valueOpen = data[i].Open;
                valueHigh = data[i].High;
                valueLow = data[i].Low;
                valueClose = data[i].Close;
                yvalueOpen = lineAreaStart - (verticalPixelPerPoint * (valueOpen - gridMin));
                yvalueHigh = lineAreaStart - (verticalPixelPerPoint * (valueHigh - gridMin));
                yvalueLow = lineAreaStart - (verticalPixelPerPoint * (valueLow - gridMin));
                yvalueClose = lineAreaStart - (verticalPixelPerPoint * (valueClose - gridMin));
                if (valueOpen < valueClose) {
                    line(imageData, X, yvalueHigh, X, yvalueLow, this.style.UpColor.r, this.style.UpColor.g, this.style.UpColor.b, 0xff);
                    box(imageData, X - halfhorizSpacing, yvalueClose, X + halfhorizSpacing, yvalueOpen, this.style.UpColor.r, this.style.UpColor.g, this.style.UpColor.b, 0xff, false);
                }
                else {
                    line(imageData, X, yvalueHigh, X, yvalueLow, this.style.DownColor.r, this.style.DownColor.g, this.style.DownColor.b, 0xff);
                    box(imageData, X - halfhorizSpacing, yvalueOpen, X + halfhorizSpacing, yvalueClose, this.style.DownColor.r, this.style.DownColor.g, this.style.DownColor.b, 0xff, false);
                }
            }
            X += horizSpacing;
        }
    };
    return Rocketchart;
}());
