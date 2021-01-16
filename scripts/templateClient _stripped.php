<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>Multimedia chat</title>
  <link rel="stylesheet" type="text/css" href="<?php print($pathBias."assets/".version($cssLink,$pathBias)); ?>" media="all" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.5" />
</head>
<body>

<form action="?" method="GET">
<fieldset id="accountPanel">
  <p id="accountTopAlertP"></p>
  <input type="text" id="realmInput" placeholder="Room" name="realm" />
  <input type="text" id="userInput" placeholder="Your name" name="user" />
  <input type="password" id="passwordInp" placeholder="Password" name="password" />
  <!--<br />-->
  <input type="submit" id="exitBtn" value="Register" />
  <a href="?">Exit</a>
  <!--<a href="<?php if ( isset($pr) && $pr->checkNotEmpty("lang") && $pr->g("lang") != "en" ) echo "manual_".$pr->g("lang").".html"; else echo "manual_en.html"; ?>" target="_blank" >Help</a>-->
  <p id="accountBottomAlertP"></p>
</fieldset>
</form>

<div id="controlsPanel">Here we are</div>

<div id="playerRoom">

</div>

<div id="footer">
&nbsp;<br />
free communication software by TrueWatcher 2020 based on the Janus WebRTC server
</div>

<script>
  var jv={};// namespace root
</script>
<script src="<?php print($pathBias."assets/".version("utils.js",$pathBias)); ?>"></script>

<script>
"use strict";
//jv.mimeDictionary='<?php /*print(json_encode($mimeDictionary));*/ ?>';
//jv.mimeDictionary=JSON.parse(jv.mimeDictionary);

jv.serverParams='<?php print(json_encode($serverParams)); ?>';
jv.serverParams=JSON.parse(jv.serverParams);

var ur={ user: jv.serverParams.user, realm: jv.serverParams.realm };
jv.userParams={ vr: ur };

function $(id) { return document.getElementById(id); }

jv.TopManager=function(sp) {
  var connector={}, recorderBox={}, playerBox={}, kbm={}, rtcBox={};
  
  this.go=function() {
    if(sp.title) document.title=sp.title;
    if(sp.state == "zero") {
      initZero();
    }
    else {
      initFull();
    }
  };
  
  function initZero() {
    controlsPanel.style.display="none";
    accountTopAlertP.innerHTML="Please introduce yourself";
    accountBottomAlertP.innerHTML=sp.error || sp.alert || "";
    if (sp.realm) $("realmInput").value=sp.realm;
  }
  
  function initFull() {
    //connector=new jv.Connector(jv.serverParams, jv.userParams);
    //if(sp.reportErrors) jv.utils.initErrorReporter(connector.push);
    
    jv.screenParams=jv.utils.getScreenParams();
    adjustLayout(jv.screenParams);
    
    $("userInput").value=sp.user;
    $("realmInput").value=sp.realm;
    $("accountBottomAlertP").innerHTML="";//"Registration OK";
    
    var found=jv.utils.checkBrowser();
    console.log(jv.utils.dumpArray(found));
    if(found.outcome !== true) {
      accountBottomAlertP.innerHTML=found.outcome;
      throw new Error(found.outcome);
    }
    
    // more of these
  }
    
  function adjustLayout(screenParams) {
    var isPortrait=0,// set this to 1 to debug
        videoWidth,
        videoHeight;
    isPortrait=isPortrait || screenParams.isPortrait;
    if (isPortrait) {// normally mobile, narrow screen
      //console.log("portrait screen");
      $("playerRoom").style="display: table-cell; padding:5px; width: 95%";
      jv.utils.addCss("video { max-width: 100%; }");
      jv.utils.addCss("fieldset { margin: 0; padding: 0.2em; }");
      document.body.style.width=Math.floor(screenParams.width*0.95)+"px";
      $("textInp").style.width="95%";
      //$("chatText").style.width="98%";
    }  
    else {// landscape -- normally desktop
      videoWidth=Math.floor(screenParams.width*0.46);//0.85
      $("playerRoom").style="position: fixed; bottom:5px; right:5px";
      jv.utils.addCss("video { max-width:"+videoWidth+"px; }");
    }
    videoHeight=Math.floor(screenParams.height-15);
    // adjust for the mobile browser's status bar
    if (screenParams.isMobile) videoHeight += screenParams.emPx*2;
    jv.utils.addCss("video { max-height:"+videoHeight+"px; }");
  }
  
};

jv.tm=new jv.TopManager(jv.serverParams);
jv.tm.go();

</script>

<?php if ( ! isset($disableTail)) { ?>
</body>
</html>
<?php }?>
