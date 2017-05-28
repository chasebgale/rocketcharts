declare class Rocketchart {
    private options;
    private element;
    private primary;
    constructor(element: HTMLElement | string, options?: Options);
    Series(data: OHLCD[], precision?: number): void;
}
interface Options {
    ColorBackground?: string;
    ColorPositive?: string;
    ColorNegative?: string;
    ColorNeutral?: string;
    CandleWidth?: number;
    CandlePadding?: number;
    [key: string]: any;
}
interface OHLCD {
    Open: number;
    High: number;
    Low: number;
    Close: number;
    Date: string;
}
