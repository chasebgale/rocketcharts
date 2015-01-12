<pre>
                    *     .--.
                         / /  `   
        +               | |       
               '         \ \__,   
           *          +   '--'  *
               +   /\
  +              .'  '.   *
         *      /======\      +
               ;:.  _   ;
               |:. (_)  |
               |:.  _   |
     +         |:. (_)  |          *
               ;:.      ;
             .' \:.    / `.
            / .-'':._.'`-. \
            |/    /||\    \|
      jgs _..--"""````"""--.._
    _.-'``                    ``'-._
  -'                                '-
</pre>
  
Rocketcharts
Licensed under GPLv3 (http://www.opensource.org/licenses/gpl-3.0.html)
Authored by Chase Gale (http://chasegale.com)

Demo and breakdown: http://chasegale.com/2011/10/21/Introducing-Rocketcharts-Open-source-HTML5-Financial-Statistical-Charts/

```html
<script type="text/javascript" src="jquery.min.js"></script>
<script type="text/javascript" src="rocketcharts.js"></script>
<script type="text/javascript">
   $(document).ready(function () {    
 
      var rocketcharts = new Rocketchart();
 
      rocketcharts.init(document.getElementById("rocketchart")); 
 
      var googData = [{date: "11/9/2010", open: 17.22, high: 17.6, low: 16.86, close: 16.97, volume: 56218900},
                      {date: "11/10/2010", open: 17, high: 17.01, low: 16.75, close: 16.94, volume: 17012600},
                      ...etc...
                      {date: "9/29/2011", open: 14.34, high: 14.39, low: 13.15, close: 13.42, volume: 45776600},
                      {date: "9/30/2011", open: 13.21, high: 13.44, low: 13.11, close: 13.17, volume: 30232800}];
 
      // rocketcharts.addSeries(title, data, type, style, panel);
      rocketcharts.addSeries("GOOG", googData, undefined, style);
      
      // rocketcharts.addIndicator(id, params, series, panel);
      rocketcharts.addIndicator("movingaverageconvergancedivergance", undefined, 0);
 
   });
</script>
```