"use strict";
if ( ! jv) jv={};
jv.utils={};

jv.utils.dumpArray=function(x) {
  var res="",i,expanded;
  if (typeof x == "object") {
    res+="{ ";
    for (i in x) {
      if (x.hasOwnProperty(i)) {
        res+=" "+i+":"+jv.utils.dumpArray(x[i]);
      }  
    }
    res+=" }";
  }
  else res+=""+x;
  return res;  
};

jv.utils.blockMobileZoom=function() {
  var meta=document.createElement("meta");
  meta.name="viewport";
  meta.content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0";
  document.head.appendChild(meta);
};

jv.utils.getScreenParams=function() {
  var emPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
  var isMobile = null;
  if (typeof window.matchMedia == "function") isMobile = window.matchMedia("only screen and (max-width: 760px)");
  var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  var height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
  //var viewportHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
  var isPortrait=(width < height);
  return { isPortrait:isPortrait, width:width, height:height, isMobile : isMobile, emPx : emPx };
};

jv.utils.checkBrowser=function() {
  var mediaDevices = typeof navigator.mediaDevices == "object";
  var mediaRecorder = typeof MediaRecorder == "function";
  var plainGetUserMedia = typeof navigator.getUserMedia == "function";
  var MediaRecorder_isTypeSupported = mediaRecorder && typeof MediaRecorder.isTypeSupported == "function";
  //var mediaRecorder_isTypeSupported = "?", mr={};
  var outcome="?";
  
  if ( ! mediaDevices) outcome="No navigator.mediaDevices";
  else if ( ! mediaRecorder) outcome="No MediaRecorder";
  else if ( ! MediaRecorder_isTypeSupported) { outcome="No MediaRecorder.isTypeSupported"; }  
  else outcome=true;
  
  return {
    mediaDevices:mediaDevices,
    mediaRecorder:mediaRecorder,
    plainGetUserMedia:plainGetUserMedia,
    MediaRecorder_isTypeSupported:MediaRecorder_isTypeSupported,
    outcome:outcome
  };
};

jv.utils.addCss=function(str) {
  var css = document.createElement("style");
  css.type = "text/css";
  css.innerHTML = str;
  document.body.appendChild(css);
};

jv.utils.checkAutoplay=function(audioFile, onNotallowed, onError) {
  var el=new Audio();
  //el.autoplay=false;
  el.oncanplaythrough=function() {  
    //console.log("Media is ready"); 
    var promise=el.play();
    if (promise.catch && promise.catch instanceof Function) {
      promise.catch(function(error) {
        if (error.name === "NotAllowedError") { 
          alert("You should enable autoplay in you browser");
          if (onNotallowed instanceof Function) onNotallowed();
        }
        else {
          alert("Something is wrong with media playing:"+error.name); 
          if (onError instanceof Function) onError();
        }
      });
      promise.then(function() { console.log("autoplay ok"); });
    }
  };
  el.onended=function() { document.body.removeChild(el); };
  el.src=audioFile;
  document.body.appendChild(el);
  console.log("testing autoplay...");
};

jv.utils.Indicator=function(id,states,htmlOrValue,startState) {
  var el=document.getElementById(id);
  var disp=el.style.display;
  if ( ! el) throw new Error("Wrong Id");
  if ( ! htmlOrValue) htmlOrValue="h";
  if ( ! states instanceof Array || states.length < 2) throw new Error("Wrong STATES");
  var cl=states.length;
  var sc=allOrNone()
  if ( ! startState) startState=0;
  if (startState >= cl) throw new Error("Too big STARTSTATE");
  var state;
  adoptState(startState);
  
  this.getElement=function() { return el; };
  
  this.on=function() { adoptState(1); };
  this.off=function() { adoptState(0); };
  this.z=function() { adoptState(2); };
  this.toggle=function() {
    if (state == 0) adoptState(1);
    else if (state == 1) adoptState(0);
    else console.log("Cannot toggle z-state");
  }
  this.hide=function() { el.style.display="none"; };
  this.unhide=function() { el.style.display=disp; };
    
  function adoptState(index) {
    if (sc.strings) {
      if (htmlOrValue == "h") el.innerHTML=states[index][0];
      else el.value=states[index][0];
    }
    if (sc.classes) {
      removeOtherClasses(index);
      el.classList.add(states[index][1]);      
    }
    state=index;
  }
  
  function allOrNone() {
    var withStringCount=0,
        withoutStringCount=0,
        withClassCount=0,
        withoutClassCount=0;
    for (var i=0; i < cl; i+=1) {
      if ( !! states[i][0]) withStringCount+=1;
      else withoutStringCount+=1;
      if ( !! states[i][1]) withClassCount+=1;
      else withoutClassCount+=1;
    }
    if (withStringCount != cl && withoutStringCount != cl) throw new Error("Element: "+id+" Strings must be given for all states or for no state");
    if (withClassCount != cl && withoutClassCount != cl) throw new Error("Element: "+id+" Classes must be given for all states or for no state");
    return { strings : withStringCount == cl, classes : withClassCount == cl};
  }
  
  function removeOtherClasses(stateIndex) {
    var c;
    for (var i=0; i < cl; i+=1) {
      if (i == stateIndex) continue;
      el.classList.remove(states[i][1]);
    }   
  }
  
  this.removeAllStateClasses=function() {
    var c;
    for (var i=0; i < cl; i+=1) {
      el.classList.remove(states[i][1]);
    }
  };
}// end Indicator

jv.utils.escapeHtml=function(text) {
// https://stackoverflow.com/questions/1787322/htmlspecialchars-equivalent-in-javascript
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
};
