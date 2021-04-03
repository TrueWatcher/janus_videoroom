<?php
/**
 * Handles AJAX uploads
 */
$pathBias="";
require_once("scripts/AssocArrayWrapper.php");
require_once("scripts/MyExceptions.php");
require_once("scripts/registries.php");
require_once("scripts/Inventory.php");

// user,realm,blob,mime,ext,duration
//print("Hi, I'm upload.php\n");
//print("max=".ini_get("post_max_size")."!");
//print_r($_POST);
//print(implode(",",array_keys($_REQUEST)));
//print(implode(",",array_keys($_FILES)));

$input=$_REQUEST;
try {
  $resp=[];
  $p=[];
  $rr=""; $rrr="";
  //print_r($input);
  list($act,$user,$realm)=checkInput($pathBias,$input);
  $targetPath=$pathBias."rooms/".$input["realm"]."/";
  $iniParams=IniParams::read($targetPath);
  $pr=PageRegistry::getInstance( 0, PageRegistry::getDefaultsAjax() );
  $pr->overrideValuesBy($iniParams["common"]);
  //$pr->dump();  
  
  switch ($act) {
  case "uploadBlob":
    checkFields($input);
    checkBlob($_FILES,$pr);
    $inv=new Inventory();
    $inv->init($targetPath,$pr->g("mediaFolder"));
    $inv->removeExpired();
    //$inv->removeOverNumber($pr->g("maxClipCount"));
    //$n=$inv->newName($input["ext"]);
    if (isset($input["nameExt"])) $nameExt=$input["nameExt"];
    else $nameExt=$input["description"].".".$input["ext"];
    $uploadedBytes=$inv->pickUploadedBlob($nameExt,$input,$pr);
    $uploadedBytes=Inventory::b2kb($uploadedBytes);
    //echo(" estimated_bytes=".$inv->getTotalBytes()." , found=".$inv->getDirectorySize()." ");
    $resp=makeFileData($input,$pr,$nameExt);
    $resp["alert"]='upload OK';
    break;
  
  case "clearMedia":
    $inv=new Inventory();
    //$inv->init($targetPath,$pr->g("mediaFolder"));
    $inv->clear($targetPath,$pr->g("mediaFolder"));
    $resp["alert"]="files cleared";
    break;
    
  case "delete":
    if ( ! isset($input["id"])) throw new DataException("Missing ID");
    $id=$input["id"];    
    $inv=new Inventory();
    $inv->init( $targetPath, $pr->g("mediaFolder"));
    unlinkById($id,$inv,$input);    
    $inv->deleteLine($id);
    $resp["alert"]="Clip deleted";
    //$wsOn && sendCatalogToWs($inv,$pr,"",$realm,$resp["alert"]);    
    break;
    
  case "removeExpired":
    $inv=new Inventory();
    $inv->init( $targetPath, $pr->g("mediaFolder"));
    $c=$inv->removeExpired();
    if ($c) $resp["alert"]="$c expired clips deleted";
    else $resp["alert"]="No outdated clips found";
    break;
    
  case "getCatalog":
    $inv=new Inventory();
    $inv->init( $targetPath, $pr->g("mediaFolder"));
    $c=$inv->removeExpired();
    $resp["catalog"]=adaptCatalog($inv->getCatalog(), $pr);
    $resp["alert"]="OK";
    break;
    
  
  default:
    throw new DataException("Unknown command=$act!");
  }
  
} catch (DataException $de) {
  $resp["error"]=$de->getMessage();
}
if ($resp === 204) {
  header("HTTP/1.0 204 No Content");
  exit();
}
if ($resp === 304) {
  header("HTTP/1.0 304 Not Modified");
  exit();
}
header('Content-type: text/plain; charset=utf-8');//application/json
print(json_encode($resp));
exit();


function checkFields($input) {
  $r=true;
  if ( isset($input["description"]) ) $input["description"]=htmlspecialchars($input["description"]);
  if ( ! isset($input["mime"]) || ! isset($input["ext"]) ) $r="Missing MIME or EXT";
  //else if ( ! checkExt($input["ext"])) $r="Unknown EXT=".$input["ext"]."!";
  else if ( isset($input["description"]) && strlen($input["description"]) > 200 ) {
    $input["description"]=substr($input["description"],0,100);
  }
  if (isset($input["nameExt"]) && @$input["nameExt"][0] === ".") $r="Wrong NAMEEXT";
  if (! isset($input["mime"])) $input["mime"]="";
  $input["duration"]=0;
  if ($r !== true) throw new DataException($r);
}

function checkBlob($files,$pr) {
  $r=true;
  $allowedMiB=ceil($pr->g("maxBlobBytes")/1048576);
  if ( ! isset($files["blob"])) $r="Missing the file";
  else if ( $allowedMiB > intval(ini_get('upload_max_filesize')) ) $r="Parameter in .ini is bigger than upload_max_filesize in php.ini:".$allowedMiB."/".ini_get('upload_max_filesize');
  else if ( $allowedMiB > intval(ini_get('post_max_size')) ) $r="Parameter in .ini is bigger than post_max_size in php.ini:".$allowedMiB."/".ini_get('post_max_size');
  else if ( $files["blob"]["size"] > $pr->g("maxBlobBytes") ) $r="File is too big, server allows only ".Inventory::b2kb($pr->g("maxBlobBytes"));
  if ($r !== true) throw new DataException($r);
}

function checkInput($pathBias,& $input) {
  $r=true;
  consumeJson($input);
  if ( ! isset($input["user"]) || ! isset($input["realm"]) ) {
    $r="Missing USER or REALM (act=".@$input["act"].")";
    //print_r($input);
  }
  else if ( charsInString($input["user"],"<>&\"':;()") ) { $r="Forbidden symbols in username"; }
  else if ( strlen($input["user"]) > 30 ) { $r="Too long username"; }
  else if ( ! realmIsOk($pathBias,$input)) {
    $r="Thread folder not found:".$pathBias."rooms/".$input["realm"];
  }
  else if ( ! array_key_exists("act",$input)) { $r="Missing ACT"; }
  if ($r !== true) throw new DataException($r);
  return [$input["act"], $input["user"], $input["realm"]];
}

function consumeJson(& $input) {  
  if ( ! array_key_exists("json",$input)) return;
  $fromJson=[];
  if ( strpos($input["json"],"%3A") !== false ) { $input["json"]=urldecode($input["json"]); }
  $input["json"]=str_replace("\n", "\\n", $input["json"]);
  $fromJson=json_decode($input["json"], true);
  if (! is_array($fromJson)) {
    echo $input["json"]; echo ">>"; var_dump($fromJson);
    throw new DataException("JSON perse error");
  }
  $input=array_merge($input,$fromJson);
  unset($input["json"]);
}

function charsInString($object,$charsString) {
  if ( empty($object) ) return false;
  if (strtok($object,$charsString) !== $object) return true;
  return false;
}

function realmIsOk($pathBias,$input) {
  if ( ! isset($input["realm"]) || empty($input["realm"]) ) return false;
  $targetPath=$pathBias."rooms/".$input["realm"];
  return file_exists($targetPath) && is_dir($targetPath);
}

function unlinkById($id,Inventory $inv,$input) {
  $l=$inv->getLine($id);
  if ( ! $l) throw new DataException("No data about this file");
  if ($l["author"] != $input["user"]) throw new DataException("You are not permitted");
  $target=$inv->getMediaPath().$l["fileName"];
  if ( ! file_exists($target)) throw new DataException("No such file $target");
  unlink($target);
}

function copyy($arr,$keys) {
  $res=[];
  foreach ($keys as $k) {
    if ( ! array_key_exists($k,$arr)) throw new DataException("Unknown key:".$k."!");
    $res[$k]=$arr[$k];
  }
  return $res;
}

function makeHref($nameExt, $realm, $pr) {
  return $pr->g("serverPath")."rooms/".$realm."/".$pr->g("mediaFolder")."/".$nameExt;
}

function adaptCatalog(Array $data,$pr) {
  $r=[];
  foreach ($data as $line) {
    $r[]=makeFileData2($line,$pr);
  }
  return $r;
}

function makeFileData($input,$pr,$nameExt) {
  $expire=date( "H:i", time()+3600*$pr->g("timeShiftHrs")+$pr->g("clipLifetimeSec") );
  $r=[
    "user"=>$input["user"], "realm"=>$pr->g("realm"), "size"=>$input["size"], "expire"=>$expire, "nameExt"=>$nameExt
  ];
  $r["href"]=makeHref($r["nameExt"], $r["realm"], $pr);
  return $r;
}

function makeFileData2($line,$pr) {
  // $keys=["fileName","author","dateTime","mime","duration","bytes","expire","description"];
  $l=array_combine(Inventory::getKeys(),$line);
  $expire=date( "H:i", $l["expire"]+3600*$pr->g("timeShiftHrs") );
  $r=[
    "user"=>$l["author"], "realm"=>$pr->g("realm"), "size"=>$l["bytes"], "expire"=>$expire, "nameExt"=>$l["fileName"]
  ];
  $r["href"]=makeHref($r["nameExt"], $r["realm"], $pr);
  return $r;
}


?>
