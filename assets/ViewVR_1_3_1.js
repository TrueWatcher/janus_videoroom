"use strict";

jv.ViewVR = function() {

  var bitrateTimer = [], cb={}, sp={}, aspectTimer=null,
      publishIndicator = new jv.utils.Indicator("publishBtn",[["Publish"],["Unpublish"],["Connecting..."]],"v",2),
      muteIndicator = new jv.utils.Indicator("muteBtn",[["Mute"],["Unmute"]],"v",0),
      rg=new jv.ResponsiveGrid("playerRoom"),
      bitrateSelect=$$("bitrateSelect"),
      isLandscape="ыыы";//true;
      
  function init(serverParams,callbacks) {
    sp=serverParams;
    cb=callbacks;
    if ( ! aspectTimer) aspectTimer=setInterval(watchAspectRatio,1000);
    //setTimeout(function() { moveSpans("1/1"); },5000); // DEBUG
    
    $$("bitrateSelect").onclick=function() { cb.setBitrateCap(getBitrate()); };
    $$("sendBtn").onclick=function() { cb.sendChatMessage(takeChatMessage()); };
    $$("fileSendInp").onchange=function() { cb.sendFile(this.files[0]); };
  }
  
  function aalert(s,cb) {
    var sep=" ",
        ss=$$('accountBottomAlertP').innerHTML;
    if ( ! s) ss="";
    else if (ss) ss=ss+sep+s;
    else ss=s;
    $$('accountBottomAlertP').innerHTML=ss;
    if (typeof cb === "function") cb();
  }

  function redefineExit() {
    $$('exitBtn').onclick=function() { window.location.search=""; cb.die(); };
  }
      
  function adoptPublishedState(isPublished) {
    if (isPublished === -1) { // new
      publishIndicator.z();//hide();
      publishIndicator.getElement().onclick=function(){};
      muteIndicator.hide();
      bitrateSelect.style.display="none";
      toggleChat(false);
    }
    else if (isPublished === 1) { // my feed is published
      publishIndicator.unhide();
      muteIndicator.unhide();
      publishIndicator.on();
      publishIndicator.getElement().onclick=cb.unpublishOwnFeed;
      muteIndicator.off();
      muteIndicator.getElement().onclick=cb.toggleMute;
      bitrateSelect.style.display="";
      toggleChat(true);
    }
    else if (isPublished === 0) { // my feed is unbuplished
      publishIndicator.unhide();
      muteIndicator.hide();
      publishIndicator.off();
      publishIndicator.getElement().onclick=function() { cb.publishOwnFeed(true); };
      bitrateSelect.style.display="none";
      toggleChat(false);
    }
    else throw new Error("Wrong isPublished="+isPublished);
  }
  
  function getBitrate() {
    return jv.utils.getSelect("bitrateSelect");
  }
  
  function toggleChat(onOff) {
    $$("textInp").disabled= ! onOff;
    $$("sendBtn").disabled= ! onOff;
  }
      
  function adjustLayout() {
    var isPortrait=0,// set this to 1 to debug
        videoWidth,
        videoHeight;
        
    var screenParams=jv.screenParams;
    isPortrait=isPortrait || screenParams.isPortrait;
    document.body.style.width=Math.floor(screenParams.width*0.96)+"px";
    //$$("playerRoom").style.display="flex";
    $$("playerRoom").style.maxHeight=Math.floor(screenParams.height*0.90)+"px";//document.body.clientHeight+"px";//Math.floor(screenParams.height*0.80)+"px";
    if (isPortrait) {// normally mobile, narrow screen
      //console.log("portrait screen");
      //document.body.style.width=Math.floor(screenParams.width*0.96)+"px";
      //$$("playerRoom").style="padding:5px; display: flex; flex-direction: column";
      //$$("playerRoom").style.height=Math.floor(screenParams.height*0.95)+"px";
      //$$("playerRoom").style.maxWidth=Math.floor(screenParams.width*0.95)+"px";
      //$$("playerRoom").style="padding:5px; width: 95%; display: flex; flex-direction: column";
      //jv.utils.addCss("fieldset { margin: 0; padding: 0.2em; }");
      $$("controlPanel").style.margin="0";
      $$("controlPanel").style.padding="0.2em";
    }  
    else {// landscape -- normally desktop
      //document.body.style.width=Math.floor(screenParams.width*0.96)+"px";
      //$$("playerRoom").style="padding:5px; width: 95%; display: flex; flex-direction: row";
      //$$("playerRoom").style="position: fixed; bottom:5px; right:5px";
      //videoWidth=Math.floor(screenParams.width*0.95);//0.85//0.46
      //jv.utils.addCss("video { max-width:"+videoWidth+"px; }");
    }
    videoHeight=Math.floor(screenParams.height-15);
    // adjust for the mobile browser's status bar
    //if (screenParams.isMobile) videoHeight += screenParams.emPx*2;
    //jv.utils.addCss("video { max-height:"+videoHeight+"px; }");
    rg.resize( Math.floor(jv.screenParams.width*0.96), Math.floor(jv.screenParams.height*0.90) );
  }

  function createMyVideo(stream) {
    var div=document.createElement("DIV");
    div.style.padding="0.5em";
    div.id="videolocal";
    var v=document.createElement("VIDEO");
    v.style.width="100%"; v.style.height="100%";
    v.autoplay=true; v.playsinline=true; v.muted=true;
    v.id="localvideo";
    div.appendChild(v);
    //v.srcObject=stream;
    Janus.attachMediaStream(v, stream);
    return div;
  }

  function createRemoteVideo(stream,handle,name) {
    var n=handle.rfindex;
    var div=document.createElement("DIV");
    div.style.padding="0.5em";
    div.id="videoremote"+n;
    div.style.position="relative";
    var v=document.createElement("VIDEO");
    v.style.width="100%"; v.style.height="100%";
    v.autoplay=true; v.playsinline=true;
    v.id="remotevideo" + n;
    div.appendChild(v); 
    
    var spanName=document.createElement("SPAN");
    spanName.id="name"+n;
    spanName.classList.add("spanName");
    spanName.innerHTML=name;
    var spanResolution=document.createElement("SPAN");
    spanResolution.id="curres"+n;
    spanResolution.classList.add("spanResolution");
    var spanBitrate=document.createElement("SPAN");
    spanBitrate.id="curbitrate"+n;
    spanBitrate.classList.add("spanBitrate");
    div.appendChild(spanName); div.appendChild(spanResolution); div.appendChild(spanBitrate);
    if (typeof handle.getBitrate == "function") {
      bitrateTimer[n] = new jv.FeedWatcher(handle, spanBitrate, spanResolution, v, div);
    }  
    //v.srcObject=stream;
    Janus.attachMediaStream(v, stream);
    return div;
  }
  
  function adoptVideo(stream,handle,display) {
    if (getVideoContainer(handle) === 0) { addVideo(stream,handle,display); }
    else reuseVideo(stream,handle,display);
  }
  
  function addVideo(stream,handle,name) {
    var el;
    if (handle === "local") el = createMyVideo(stream);
    else if ( ! handle) throw new Error("Empty handle");
    else if ( ! stream) throw new Error("Handle plus empty stream");
    else el=createRemoteVideo(stream,handle,name);
    if (handle === "local") { rg.prepend(el); }
    else rg.append(el);
  }

  function reuseVideo(stream,handle,name) {
    var div=getVideoContainer(handle);
    if ( ! div) throw new Error("Cannot attach video to unknown id");
    var v=div.getElementsByTagName("video");
    if ( ! v || ! v[0]) throw new Error("No video element");
    if ( ! stream) throw new Error("No stream");
    Janus.attachMediaStream(v[0], stream);
    if (name) {
      var sn=div.querySelectorAll(".spanName");
      if (sn && sn[0]) { sn[0].innerHTML=name; }
    }
    if (handle !== "local" && bitrateTimer[handle.rfindex]) { bitrateTimer[handle.rfindex].setFeed(handle); }
  }  

  function removeVideo(handle) {
    var div=getVideoContainer(handle);
    if ( ! div) return;//throw new Error("Cannot remove unknown id");//
    if (handle !== "local") {
      if (bitrateTimer[handle.rfindex]) {
        bitrateTimer[handle.rfindex].die();
        bitrateTimer[handle.rfindex]=null;
      }
    }
    var v=div.getElementsByTagName("video");
    if (v && v[0]) {
      if (v[0].srcObject) v[0].srcObject=null;
      if (v[0].src) v[0].src=null;
      if (v[0].onplaying) v[0].onplaying=function(){};
    }
    v=null;
    div=null;
    rg.remove(handle2id(handle));
  }
  
  function capVideo(handle) {
    var div=getVideoContainer(handle);
    if ( ! div) throw new Error("Cannot cap unknown id");
    var v=div.getElementsByTagName("video")[0];
    if ( ! v) throw new Error("No video element");
    v.classList.add("nodisplay");
    toggleSpans(handle,div,false);
    var novideos=div.getElementsByClassName("no-video-container");
    if (novideos && novideos[0]) novideos[0].classList.remove("nodisplay");
    else {
      var novideoDiv=document.createElement("DIV");
      novideoDiv.classList.add("no-video-container");
      var localOrRemote = handle === "local" ? "local" : "remote"; 
      novideoDiv.innerHTML='<i class="fa fa-video-camera fa-5 no-video-icon"></i>' +
                    '<span class="no-video-text">No '+localOrRemote+' video available</span>';
      div.appendChild(novideoDiv);              
    }
    if (handle !== "local" && bitrateTimer[handle.rfindex]) { bitrateTimer[handle.rfindex].stop(); }
  }

  function uncapVideo(handle) {
    var div=getVideoContainer(handle);
    if ( ! div) return;//throw new Error("Cannot remove unknown id");
    toggleSpans(handle,div,true);
    var novideos=div.getElementsByClassName("no-video-container");
    if (novideos && novideos[0]) novideos[0].classList.add("nodisplay");
    var v=div.getElementsByTagName("video")[0];
    if ( ! v) throw new Error("No video element");
    v.classList.remove("nodisplay");
    if (handle !== "local" && bitrateTimer[handle.rfindex]) { bitrateTimer[handle.rfindex].run(); }
  }
    
  function toggleSpans(handle,div,onOff) {
    if (handle === "local") return;
    var spanResolution=div.querySelectorAll(".spanResolution");
    if (spanResolution && spanResolution[0]) {
      if (onOff) spanResolution[0].classList.remove("nodisplay");
      else  spanResolution[0].classList.add("nodisplay");
    }  
    var spanBitrate=div.querySelectorAll(".spanBitrate");
    if (spanBitrate && spanBitrate[0]) {
      if (onOff) spanBitrate[0].classList.remove("nodisplay");
      else spanBitrate[0].classList.add("nodisplay");
    }
  }
  
  function handle2id(handle) {
    var id;
    if (handle === "local") id="videolocal";
    else if ( ! handle.rfindex) throw new Error("Missing rfindex of "+handle);
    else  id="videoremote"+handle.rfindex;
    return id;
  }
  
  function getVideoContainer(handle) { return rg.get(handle2id(handle)); }
  
  function watchAspectRatio() {
    var isLandscape2=isAllLanscape();
    if (isLandscape2 === isLandscape) return;
    isLandscape=isLandscape2;
    var ar=isLandscape ? "4/3" : "1/1";
    console.log("Changing grid aspectRatio to "+ar);
    rg.setAspect(ar);
    moveSpans(ar);
    //aalert(ar);
  }
  
  function isAllLanscape() {
    var allLandscape=true;
    bitrateTimer.forEach(function(fw) {
      if (fw && fw.intHandle && fw.aspectRatio > 0 && fw.aspectRatio <= 1 ) {
        allLandscape=false;
        //console.log("found a portrait fw:"+fw.getNum());
      }
      //else { if (fw && fw.intHandle) console.log("active landscape fw:"+fw.getNum()+"/"+fw.aspectRatio); }
    });
    if ( ! allLandscape) return false;
    var localvideo=$$("playerRoom").querySelector("#localvideo");
    if (localvideo && localvideo.videoWidth && localvideo.videoHeight) {
      allLandscape=(localvideo.videoWidth > localvideo.videoHeight);
      //aalert("vl is l:"+allLandscape);
    }
    //else aalert("no_vl");
    return allLandscape;
  }
  
  function moveSpans(aspectRatio) {
    bitrateTimer.forEach(function(fw) {
      if ( ! fw) return;
      if (fw.aspectRatio > 1) moveSpans2(aspectRatio, fw.container, fw.aspectRatio);                     
    });
  }
  
  function moveSpans2(aspectRatio,div,divAspectRatio) {
    var div=div || $$("playerRoom");
    var spanResolution=div.querySelectorAll(".spanResolution");
    var edging=0;
    if (aspectRatio === "1/1") edging=Math.floor((divAspectRatio-1)*50*(3/4))+"%";//"12%";
    [].forEach.call( spanResolution, function(el) { el.style.bottom=edging; } ); 
    var spanBitrate=div.querySelectorAll(".spanBitrate");
    [].forEach.call( spanBitrate, function(el) { el.style.bottom=edging; } );
    var spanName=div.querySelectorAll(".spanName");
    [].forEach.call( spanName, function(el) { el.style.top=edging; } );
  }
  
  function chatAlert(s,shouldReplace,cb) {
    if (shouldReplace) {
      $$('chatAlertP').innerHTML=s;
      return;
    }
    var sep=" ",
        ss=$$('chatAlertP').innerHTML;
    if ( ! s) ss="";
    else if (ss) ss=ss+sep+s;
    else ss=s;
    $$('chatAlertP').innerHTML=ss;
    if (typeof cb === "function") cb();
  }
  
  function addToChat(dataObj) {
    if (typeof dataObj !== "object") throw new Error("Not an object:"+dataObj);
    var sender=dataObj.from;
    if ( ! sender) return;
    var msg=dataObj.message;
    if ( ! msg) msg="[empty]";
    var str="<b>"+jv.utils.escapeHtml(sender)+"</b> : "+jv.utils.escapeHtml(msg);
    appendToChat(str);
  }
  
  function appendToChat(str) {
    var chatText=$$("chatText");
    var content=chatText.innerHTML;
    var sep="<br/>";
    if (content) content=str+sep+content;
    else content=str;
    chatText.innerHTML=content;
  }
  
  function addBlobToChat(blob,sender,metadata) {
    if ( ! (blob instanceof Blob)) throw new Error("Not a Blob");
    const downloadLink = document.createElement("A");
    //downloadLink.id="downloadLink";
    downloadLink.href = URL.createObjectURL(blob);
    if ( ! metadata) downloadLink.innerHTML="The file";
    else { 
      downloadLink.innerHTML=downloadLink.download=jv.utils.escapeHtml(metadata.name);
    }
    var str="<b>"+jv.utils.escapeHtml(sender)+"</b> : "+downloadLink.outerHTML+" ("+jv.utils.escapeHtml(blob.size)+"B)";
    if (metadata.size && (blob.size != metadata.size)) str += " Warning! sender's size="+metadata.size+"B";
    appendToChat(str);
  }
  
  function takeChatMessage() {
    var v=$$("textInp").value;
    $$("textInp").value="";
    return v;
  }

  return { init: init, alert: aalert, redefineExit: redefineExit, adoptPublishedState: adoptPublishedState, getBitrate: getBitrate, adjustLayout: adjustLayout, capVideo: capVideo, uncapVideo: uncapVideo, adoptVideo: adoptVideo, addVideo: addVideo, removeVideo: removeVideo, muteIndicator: muteIndicator, addToChat: addToChat, addBlobToChat: addBlobToChat, chatAlert: chatAlert };

}// end ViewVR

jv.FeedWatcher=function(aFeed, spanBitrate, spanResolution, videoEl, container) {
  var _this=this,
      num=-1,
      feed=aFeed;
  
  num=feed.rfindex;
  
  this.container=container;
  
  this.intHandle=null;
  
  this.setFeed=function(aFeed) { feed=aFeed; num=feed.rfindex; };
  
  this.aspectRatio=0;
  
  this.ontick=function() {
    if ( ! feed) {
      throw new Error("running feedWatcher #"+num+" with empty feed");
      //_this.die();
      //return;
    }
    if (typeof feed.getBitrate === "function") {
      var b=feed.getBitrate();
      if (b && (b == b) && b.indexOf("NaN") < 0) spanBitrate.innerHTML = b;// may be NaN or "NaN kbps"
      else spanBitrate.innerHTML = "";
    }
    var w = videoEl.videoWidth;
    var h = videoEl.videoHeight;
    if (w && h) {
      spanResolution.innerHTML=w+'x'+h;
      _this.aspectRatio=w/h;
    }
  };
  
  this.run=function() { 
    if (this.intHandle) return;// the evil thing may try to run this many times
    if ( ! feed) {
      throw new Error("Attempt to run feedWatcher #"+num+" with empty feed");
    }
    this.intHandle=setInterval(_this.ontick, 1000);
  };
  
  this.stop=function() { 
    if (_this.intHandle) {
      clearInterval(_this.intHandle);
      _this.intHandle=null;
    }
  };
  
  this.die=function() {
    _this.stop();
    _this.container=null;
    container=null;
    aFeed=null;
    feed=null;
    spanBitrate=null;
    spanResolution=null;
    videoEl=null;
  };
  
  this.getNum=function() { return num; };
  
  this.run();
};// end FeedWatcher

