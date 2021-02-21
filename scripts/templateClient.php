<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>Video conference</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.5" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/webrtc-adapter/6.4.0/adapter.min.js" ></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/2.1.4/toastr.min.js"></script>
  <script src="<?php print($pathBias."assets/"."janus.js"); ?>"></script>
  
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/2.1.4/toastr.min.css"/>
  <link rel="stylesheet" type="text/css" href="<?php print($pathBias."assets/".version($cssLink,$pathBias)); ?>" media="all" />
</head>
<body>

<fieldset id="controlPanel">
  <span id="accountSpan"></span>
    <!--<a href="<?php if ( isset($pr) && $pr->checkNotEmpty("lang") && $pr->g("lang") != "en" ) echo "manual_".$pr->g("lang").".html"; else echo "manual_en.html"; ?>" target="_blank" >Help</a>-->
  <input type="button" id="publishBtn" value="Publish" title="unpublish/publish your stream" />
  <input type="button" id="muteBtn" value="Mute" title="mute/unmute your stream" />
  <select id="bitrateSelect">
    <option value="128000">128kbps</option>
    <option value="256000">256kbps</option>
    <option value="512000" selected="selected">512kbps</option>
    <option value="0">auto</option>
  </select>
  <input type="button" id="addBtn" value="Add" />
  <input type="button" id="testBtn" value="Test" />
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <a href="?" id="exitBtn" style="float: right;"><button>Exit</button></a>
  <p id="accountBottomAlertP"></p>
</fieldset>

<div id="playerRoom"></div>

<p>&nbsp;</p>

<fieldset id="chatPanel">
  <input type="text" id="textInp" name="text" maxlength="256" placeholder="Chat message" autocomplete="off">
  <input type="button" id="sendBtn" name="send" value="Send">
  <p id="chatAlertP"></p>
  <div id="chatText"></div>
</fieldset>

<div id="footer">
  <span>&nbsp;<b>janus_videoroom</b>, a free videoconference app by TrueWatcher 2020 based on the <a href="https://github.com/meetecho/janus-gateway" target="_blank">Janus</a> WebRTC server</span>
</div>

<script>
  var jv={};// namespace root
</script>
<script src="<?php echo $pathBias."assets/".version("utils.js",$pathBias); ?>"></script>
<script src="<?php echo $pathBias."assets/".version("ResponsiveGrid.js",$pathBias); ?>"></script>
<script src="<?php echo $pathBias."assets/".version("ViewVR.js",$pathBias); ?>"></script>
<script src="<?php echo $pathBias."assets/".version("Videoroom.js",$pathBias); ?>"></script>

<script>
"use strict";
//jv.mimeDictionary='<?php /*print(json_encode($mimeDictionary));*/ ?>';
//jv.mimeDictionary=JSON.parse(jv.mimeDictionary);

jv.serverParams='<?php print(json_encode($serverParams)); ?>';
jv.serverParams=JSON.parse(jv.serverParams);
var sp=jv.serverParams;
//var ur={ user: jv.serverParams.user, realm: jv.serverParams.realm };
//jv.userParams={ vr: ur };

function $$(id) { return document.getElementById(id); }

if (sp.title) document.title=sp.title;
jv.screenParams=jv.utils.getScreenParams();

$$("accountSpan").innerHTML=sp.realm+" : "+sp.user;
$$("accountBottomAlertP").innerHTML="";//"Registration OK";

var found=jv.utils.checkBrowser();
console.log(jv.utils.dumpArray(found));
if (found.outcome !== true) {
  accountBottomAlertP.innerHTML=found.outcome;
  throw new Error(found.outcome);
}
//jv.utils.checkAutoplay("assets/i30_open.mp3");// will probably fail here

var vr=new jv.Videoroom();
var view=new jv.ViewVR();
vr.init(sp,view);
vr.add();
vr.run();

</script>

<?php if ( ! isset($disableTail)) { ?>
</body>
</html>
<?php }?>
