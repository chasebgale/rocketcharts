class Rocketchart {
  private options: Options;
  private element: HTMLElement;
  private panels:  Rocketpanel[];

  constructor(element: HTMLElement | string, options?: Options) {
    let requisite: Options = {
      CandleWidth:     3,
      CandlePadding:   0.5,
      ColorBackground: '#000000',
      ColorPositive:   '#00FF00',
      ColorNegative:   '#FF0000',
      ColorNeutral:    '#FFFFFF',
      View:            Zoom.Fixed
    };

    if (!options) {
      this.options = requisite;
    } else {
      for (let option in requisite) {
        this.options[option] = this.options[option] ? this.options[option] : requisite[option];
      }
    }

    this.element = typeof element === 'string' ? document.getElementById(element) : element;
  }

  public Series(data: OHLCD[], precision?: number): void {
    let candleWidth  = (this.options.CandleWidth + (this.options.CandlePadding * 2));
    let totalWidth   = candleWidth * data.length;

    if (this.primary === undefined) {
      

      this.panels = [];
      this.panels.push(new Rocketpanel(this.primary));
    }
    // grab the datacontext of the canvas
    let context: CanvasRenderingContext2D = this.primary.getContext('2d');

    this.panels[0].Calculate();
  }
}

interface View {
  
}

interface Options {
  ColorBackground?: string;
  ColorPositive?: string;
  ColorNegative?: string;
  ColorNeutral?: string;
  CandleWidth?: number;
  CandlePadding?: number;
  View?: Zoom;
  [key: string]: any; // http://stackoverflow.com/questions/32968332/how-do-i-prevent-the-error-index-signature-of-object-type-implicitly-has-an-an
}

interface OHLCD {
  Open: number,
  High: number,
  Low: number,
  Close: number,
  Date: string
}

enum Zoom {
  StretchToFit,
  Fixed
}