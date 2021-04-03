jv.FileTransceiverAJAX=function(onDataReceived,serverParams) {
  
  var indicator=null, onTimeout=null;
  var ajaxer=new jv.utils.Ajaxer("upload.php",onDataReceived,indicator,onTimeout);
  
  this.sendFile=function(f) {
    if ( ! (f instanceof File)) throw new Error("Not a File");
    var ext=f.name.split(".")[1];
    var blobPlusData={nameExt: f.name, size: f.size, ext: ext, mime: f.type, blob: f};
    stuff={
     act:"uploadBlob", user: serverParams.user, realm: serverParams.realm, description: "", 
     mime: f.type, ext: ext, duration: 0, nameExt: f.name, size: f.size, blob: f
    };
    ajaxer.postAsFormData(stuff);
  };
  
  this.sendRemoveExpired=function() {
    var stuff={ act: "removeExpired", user: serverParams.user, realm: serverParams.realm };
    //ajaxerR.postAsFormData(stuff);
    this.sendAsJson(stuff);
  };
  
  this.sendClearMedia=function() {
    var stuff={ act: "clearMedia", user: serverParams.user, realm: serverParams.realm };
    //ajaxerR.postAsFormData(stuff);
    this.sendAsJson(stuff);
  };
  
  this.sendGetCatalog=function() {
    var  stuff={ act: "getCatalog", user: serverParams.user, realm: serverParams.realm };
    if ( ! stuff.user) throw new Error("Failed to take USER");
    //ajaxerR.postAsFormData(stuff);
    this.sendAsJson(stuff);
  }; 
  
  this.sendAsJson=function(msgObj, timeout=10000) {
    msgObj.user=serverParams.user;
    msgObj.realm=serverParams.realm;
    ajaxer.sendAsJson(msgObj, timeout);
  };
  
}; // end FileTranscieverAJAX


jv.utils.Ajaxer=function (responderUrl,onDataReceived,indicator,onTimeout) {
  if (typeof onDataReceived != "function") throw new Error("Non-function callback argument");
  if (! indicator || ! indicator.on) indicator={on:function(){}, off:function(){}}; 
  var urlOffset="";
  if (typeof URLOFFSET != "undefined") urlOffset=URLOFFSET;
  var lag=0, timer=false, busy=false, watch=false;
  var transports=["post", "posturle" ,"postmulti", "postfd", "get", "jsonp"];
  var queue=[], queueMax=15;
  
  var _this=this, req;
  
  this.transport=null;
  
  // query string or Form
  this.postRequest=function(stuff, timeoutMs, method) {
    if (typeof method == "undefined") method=_this.transport; 
    if ( ! stuff) throw new Error ("no data");
    if ( enqueueMsg(stuff, method) ) return;
    // unconditional entry point for from-queue messages
    doPostRequest(stuff, timeoutMs, method);
  };
  
  function doPostRequest(stuff, timeoutMs, method) {
    if (typeof method == "undefined" || method.indexOf("post") < 0) throw new Error("Wrong METHOD="+metod+" -- cannot set encoding");
    timer=Date.now();
    req=new XMLHttpRequest();
    req.open("POST",urlOffset+responderUrl,true); // POST
    //console.log("ENCODING="+method);
    if (method == "postmulti") req.setRequestHeader("Content-Type","multipart/form-data");// for POST; should go _after_ req.open!
    else if (method == "posturle") req.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
    req.onreadystatechange=receive;// both
    indicator.on();
    busy=true;
    if (timeoutMs && onTimeout) {
      watch=window.setTimeout(_this.timeoutInner, timeoutMs);
    }
    //console.log("posting "+stuff);
    var q=req.send(stuff); // POST
  }
  
  // queryString or urlencoded queryString
  this.getRequest=function(queryString,timeoutMs) {
    if (enqueueMsg(queryString, "get")) return;
    doGetRequest(queryString,timeoutMs);
  };
  
  function doGetRequest(queryString,timeoutMs) {
    timer=Date.now();
    req=new XMLHttpRequest();
    var uriForGet=urlOffset+responderUrl+"?"+queryString; // GET
    req.open("GET", uriForGet); // GET
    req.onreadystatechange=receive;// both
    indicator.on();
    busy=true;
    if (timeoutMs && onTimeout) {
      watch=window.setTimeout(_this.timeoutInner, timeoutMs);
      //console.log("watching for "+timeoutMs);
    } 
    var q=req.send(null); // GET
  }
  
  var globalJsonpReceiverName=false;
  
  this.initJsonp= function() {
    if ( ! acceptMessage instanceof Function) throw new Error("Missing global receiver function (expected acceptMessage)");
    acceptMessage=_this.receiveJsonp;
    globalJsonpReceiverName="acceptMessage";
  };
  
  this.jsonpRequest=function(queryString,timeoutMs) {
    if (enqueueMsg(queryString, "jsonp")) return;
    doJsonpRequest(queryString,timeoutMs);
  };
  
  function doJsonpRequest(queryString,timeoutMs) {
    if ( ! globalJsonpReceiverName) _this.initJsonp();
    timer=Date.now();
    req = document.createElement("script");
    var uriForGet=urlOffset+responderUrl+"?"+queryString;
    uriForGet += "&jsonpWrapper="+globalJsonpReceiverName;
    req.setAttribute("src", uriForGet);
    indicator.on();
    busy=true;
    if (timeoutMs && onTimeout) {
      watch=window.setTimeout(_this.timeoutInner, timeoutMs);
      //console.log("watching for "+timeoutMs);
    }
    document.head.appendChild(req);
    document.head.removeChild(req);
    req = null;
  }
  
  function enqueueMsg(stuff, method) {
    if ( queueMax <= 0 && busy) throw new Error("Ajaxer "+responderUrl+" is busy");
    if ( queue.length == 0 && ! busy) return false; // if there is queue, put it there
    if (queue.length+1 >= queueMax) throw new Error("Ajaxer "+responderUrl+" is overflown");
    queue.push({ msg: stuff, method : method });
    console.log("Ajaxer "+responderUrl+": queued "+queue.length+"th message");
    return true;
  }
  
  this.postAsFormData=function(msgObj, to, method) {
    if ( ! method) method="postfd";
    var fd=new FormData(), p;
    for (p in msgObj) {
      if (msgObj.hasOwnProperty(p)) fd.append(p, msgObj[p]);
    }
    this.postRequest(fd, to, method);
  };
  
  this.sendAsJson=function(msgObj, to) { alert("redefine me!"); };
  
  this.setTransport=function(t) {
    if (transports.indexOf(t) < 0) throw new Error("Unknown transport:"+t);
    this.transport=t;
    //alert(transport);
    if (t == "postfd") {
      _this.sendAsJson=function(msgObj, to) {
        var msgObj = { json : JSON.stringify(msgObj) };
        _this.postAsFormData(msgObj, to);
      };
    }
    else if (t.indexOf("post") === 0) {
      _this.sendAsJson=function(msgObj, to) {
        var msgPost = "json="+JSON.stringify(msgObj);
        _this.postRequest(msgPost, to, t);
      };
    }
    else if (t == "get") {
      _this.sendAsJson=function(msgObj, to) {
        var msgGet = "json="+encodeURIComponent(JSON.stringify(msgObj));
        _this.getRequest(msgGet, to);
      };
    }
    else if (t == "jsonp") {
      _this.sendAsJson=function(msgObj, to) {
        var msgGet = "json="+encodeURIComponent(JSON.stringify(msgObj));
        _this.jsonpRequest(msgGet, to);
      };
    }
  };  
  this.setTransport("posturle");
  
  this.setQueueMax=function(n) { queueMax=n; };
  
  this.timeoutInner=function() {
    _this.reset();
    onTimeout();
  }
  
  this.reset=function() {
    if (req) req.abort();
    busy=false;
    indicator.off();
  };
  
  function receive() {
    var rdata,rmime;
    var fromQueue;
    
    if (req.readyState != 4) return;
    if (watch) clearTimeout(watch);
    lag=Date.now()-timer;
    indicator.off();
    busy=false;
    if (req.status != 200 && req.status != 204 && req.status != 304) {
      console.log(responderUrl+" ajax returned error "+req.status);
      req=null;
      return;
    }
    if (req.status != 200  && req.status != 304) {
      console.log("ajax returned code "+req.status);
      //onDataReceived(req.status);
      req=null;
      return;
    }
    if (req.status == 304) {
      //console.log("304 "+lag);
      onDataReceived({ alert : "No changes", lag : lag });
      req=null;
      return;
    }
    rdata=req.responseText;
    rmime=req.responseType;
    req=null;
    //alert(rmime);
    if (rmime === "" || rmime == "json" || rmime == "text") rdata=tryJsonParse(rdata);
    tryTakeFromQueue();
    onDataReceived(rdata);
    //setTimeout(function() { onDataReceived(rdata) }, 0);
  }
  
  this.receiveJsonp=function(responseObj) {
    var rdata,rmime;
    var fromQueue;
    lag=Date.now()-timer;
    if (watch) clearTimeout(watch);
    indicator.off();
    busy=false;
    rdata=responseObj;
    //req=null; // not good -- req needed for removeChild;
    tryTakeFromQueue();
    rdata.lag=lag;
    onDataReceived(rdata);
  }
  
  function tryTakeFromQueue() {
    if ( queueMax <= 0 || queue.length == 0) { busy=false; return false; }
    var fromQueue=queue.shift();
    busy=true;
    setTimeout(function() {
      console.log("Ajaxer "+responderUrl+": unqueued a message, "+queue.length+" remain");
      if (fromQueue.method.indexOf("post") === 0) doPostRequest(fromQueue.msg, 0, fromQueue.method); 
      else if (fromQueue.method == "get") doGetRequest(fromQueue.msg);
      else if (fromQueue.method == "jsonp") doJsonpRequest(fromQueue.msg);
      else throw new Error("Unknown method: "+fromQueue.method);         
    }, 100);
    return true;
  }
  
  function tryJsonParse(responseText) {
    if ( ! responseText) return responseText;
    var responseObj={};
    try { 
      responseObj=JSON.parse(responseText); 
    }
    catch (err) {
      //alert ("Unparsable server response:"+responseText);
      console.log("Unparsable server response:"+responseText);
      return responseText;
    }
    responseObj.lag=lag;
    return responseObj;
  }
  
  this.getLag=function() { return lag; };
  
  this.isBusy=function() {
    if (queueMax <= 0) return busy;
    var remains=(queueMax-queue.length  < 1);
    return remains;
  };
  
};// end Ajaxer
