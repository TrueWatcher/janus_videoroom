"use strict";

jv.ResponsiveGrid=function(container) {
  if ( !(container instanceof HTMLElement)) container=document.getElementById(container);
  if ( !(container instanceof HTMLElement)) throw new Error("Wrong container="+container);
  var singles = { "4/3": {w:4, h:3}, "1/1": {w:1, h:1} },
      fills   = { "4/3": {w:0.90, h:0.90}, "1/1": {w:0.90, h:0.90} },
      aspect = "1/1",//"4/3",//"1/1",//"4/3",
      myTable, videoCount=0, maxCount=10;
  
  function setMax(n) { maxCount=n; }
  
  function setAspect(s) {
    if ( ! singles[s]) throw new Error("Unknown aspect="+s);
    aspect=s;
    adjustAll();
  }
      
  function resize(w,h) {
    myTable = { "4/3": makeTable(w,h,"4/3"), "1/1": makeTable(w,h,"1/1") };
    adjustAll();
  }

  function makeTable(w,h,aAspect) {
    var isPortrait = (h > w),
        direction  = "row",
        single, fill, table, rows, cols, rows2, cols2, compr1, compr2, basis, width, height;
        
    single=singles[aAspect];
    fill=fills[aAspect];
    if ( ! single || ! fill) throw new Error("Unknown aAspect="+aAspect);
    // direction:column + wrap:wrap = bugs
    // https://stackoverflow.com/questions/18669216/how-do-i-use-flex-flow-column-wrap
    // https://stackoverflow.com/questions/39095473/flexbox-wrong-width-calculation-when-flex-direction-column-flex-wrap-wrap
    // children easily get out of the bottom of the container; has to set pixel width instead of flex-basis
    var halfScreenL=Math.floor(0.95*Math.min( w/2, (h/1)*(single.w/single.h) )),
        halfScreenP=Math.floor(0.95*Math.min( w/1, (h/2)*(single.w/single.h) )),
        tableL=[{},{n:1, wrap: "nowrap", width: halfScreenL+"px", height: Math.floor(halfScreenL*single.h/single.w)+"px", direction: direction }],
        tableP=[{},{n:1, wrap: "nowrap", width: halfScreenP+"px", height: Math.floor(halfScreenP*single.h/single.w)+"px", direction: direction }];
        
    if (isPortrait) { 
      table=tableP;
      rows=1;//2;
      cols=1;
    }
    else {
      table=tableL;
      rows=1;
      cols=1;//2;
    }
    //console.log("w/h:"+w+"/"+h+", aspect="+aAspect);
    for (var i=2; i <= maxCount; i+=1) {
      if (isPortrait) {
        rows=Math.ceil(i/cols); cols2=cols+1; rows2=Math.ceil(i/cols2);// try add one column
      }  
      else {
        cols=Math.ceil(i/rows); rows2=rows+1; cols2=Math.ceil(i/rows2);// try add one row
      }
      compr1=compression(w,h,cols,rows,single);
      compr2=compression(w,h,cols2,rows2,single);
      //console.log(i+" : "+cols2+"x"+rows2+" < "+cols+"x"+rows+" : "+ (compr2 < compr1));
      if (compr2 < compr1) { 
        cols = cols2;
        rows = rows2;
      }
      width=Math.floor( fill.w*Math.min( w/cols, (h/(rows))*(single.w/single.h) ));
      table.push({
        n: i, 
        wrap: rows > 1 ? "wrap" : "nowrap",
        width: width+"px",
        height: Math.floor(width*single.h/single.w)+"px",
      });
    }// end for
    //console.log(jv.utils.dumpArray(table));
    return table;
  }
  
  function compression(w,h,cols,rows,single) {
    var cw=single.w*cols/w;
    var ch=single.h*rows/h;
    return Math.max(cw,ch);
  }
  
  function get(id) {
    var qs=document.getElementById("playerRoom").querySelectorAll("#"+id);
    if ( ! qs || qs.length == 0) {
      console.log("Not found container "+id);
      return 0;
    } 
    else if (qs && qs.length > 1) {
      throw new Error("Several id="+id+" : "+qs.length);
      console.log("Several id="+id+" : "+qs.length);
      return false;
    }
    var div=qs[0];
    console.log("found container "+id);
    return div;
  }
  
  function adjustAll(count) {
    count=count || container.children.length;
    if ( ! count) return;
    var mt=myTable[aspect][count];
    if ( ! mt) throw new Error("Wrong aspect/count:"+aspect+"/"+count);
    container.style.flexWrap=mt.wrap;
    container.style.flexDirection="row";//mt.direction;
    [].forEach.call( container.children, function(el) { applyMyTable(el,mt); } );
    console.log("applying: "+aspect+" "+jv.utils.dumpArray(mt));
  }
  
  function fitToGrid(el) {
    if ( ! (el instanceof HTMLElement)) throw new Error("Wrong el="+elr);
    videoCount += 1;
    adjustAll(videoCount);
    var mt=myTable[aspect][videoCount];
    applyMyTable(el,mt);
  }
  
  function applyMyTable(el,mt) {
    if ( ! mt) throw new Error("Empty mt");
    if (mt.width) { 
      el.style.width=mt.width;
      el.style.flexBasis=null;
      if (mt.height) el.style.height=mt.height;
    }
    else if (mt.basis) el.style.flexBasis=mt.basis;
  }
  
  function append(el) {
    fitToGrid(el);
    container.append(el);
  }
  
  function prepend(el) {
    fitToGrid(el);
    container.prepend(el);
  }
  
  function remove(id) {    
    var div=get(id);
    if ( ! div) return;
    container.removeChild(div);
    div=null;
    videoCount -= 1;
    adjustAll();
  }
  
  return { setMax: setMax, setAspect: setAspect, resize: resize, get: get, append: append, prepend: prepend, remove: remove }
};
