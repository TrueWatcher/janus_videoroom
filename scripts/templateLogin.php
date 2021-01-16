<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>
    <?php if (@$serverParams["title"]) echo $serverParams["title"]; else echo "Video conference"; ?>
  </title>
  <link rel="stylesheet" type="text/css" href="<?php echo $pathBias."assets/".version($cssLink,$pathBias); ?>" media="all" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.5" />
  </head>
<body>

<form action="?" method="GET">
<fieldset id="accountPanel">
  <p id="accountTopAlertP">Please, introduce yourself</p>
  <input type="text" id="realmInput" placeholder="Room" name="realm" 
    <?php if (@$serverParams["realm"]) echo 'value="'.$serverParams["realm"].'"'; ?> />
  <input type="text" id="userInput" placeholder="Your name" name="user" />
  <input type="password" id="passwordInp" placeholder="Password" name="password" />
  <!--<br />-->
  <input type="submit" id="registerBtn" value="Register" />
  <!--<a href="<?php if ( isset($pr) && $pr->checkNotEmpty("lang") && $pr->g("lang") != "en" ) echo "manual_".$pr->g("lang").".html"; else echo "manual_en.html"; ?>" target="_blank" >Help</a>-->
  <p id="accountBottomAlertP">
    <?php if (@$serverParams["alert"]) echo $serverParams["alert"]; ?>
  </p>
</fieldset>
</form>

</body>
</html>
