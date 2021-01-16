<?php
/**
 * Client entry point
 */
$pathBias="";
require_once("scripts/AssocArrayWrapper.php");
require_once("scripts/MyExceptions.php");
require_once("scripts/registries.php");
require_once("scripts/AssetsVersionMonitor.php");
$input=$_REQUEST;
//$mimeDictionary=[];
$cssLink="blue.css";
try {
  checkUserRealm($pathBias,$input);
  $targetPath=$pathBias."rooms/".$input["realm"]."/";
  $iniParams=IniParams::read($targetPath);
  $pr=PageRegistry::getInstance( 0, PageRegistry::getDefaultsClient() );
  //$pr->overrideValuesBy($pageEntryParams["PageRegistry"]);
  $pr->overrideValuesBy($iniParams["common"]);
  //$pr->overrideValuesBy($iniParams["client"]);
  //$pr->dump();
  checkPsw($pathBias,$input,$pr);

  $serverParams=[
    "state"=>"operational", "user"=>$input["user"], "realm"=>$input["realm"]
  ];
  $serverParams=$pr->exportByList( [
    "serverName", "title", "reportErrors", "pathBias", "wsServerPort", "roomId", "maxPublisherCount",
    "turnPort", "turnUser", "turnCredential"
  ] , $serverParams);
  
  include("scripts/templateClient.php");
  exit();
} 
catch (NoCredentialsException $nce) {
  $serverParams=["state"=>"zero","alert"=>$nce->getMessage()];
  if (realmIsOk($pathBias,$input)) { $serverParams["realm"]=$input["realm"]; }
  include("scripts/templateLogin.php");
  exit();
}
catch (DataException $de) {
  $serverParams=["state"=>"zero","alert"=>$de->getMessage()];
  include("scripts/templateLogin.php");
  exit();
}
exit("Not to get here");

function checkUserRealm($pathBias,$input) {
  $r=true;
  if ( ! isset($input["user"]) || ! isset($input["realm"]) ) $r="";//"Missing USER or REALM";
  else if ( charsInString($input["user"],"<>&\"':;()") ) $r="Forbidden symbols in username";
  else if ( strlen($input["user"]) > 30 ) $r="Too long username";
  else if ( ! realmIsOk($pathBias,$input)) $r="Thread folder not found";
  if($r !== true) throw new NoCredentialsException($r);
}

function realmIsOk($pathBias,$input) {
  if ( ! isset($input["realm"])) return false;
  $realm="rooms/".$input["realm"];
  return file_exists($pathBias.$realm) && file_exists($pathBias.$realm."/.ini");
}

function charsInString($object,$charsString) {
  if ( empty($object) ) return false;
  if (strtok($object,$charsString) !== $object) return true;
  return false;
}

function checkPsw($pathBias,$input,PageRegistry $pr) {
  $r=true;
  if ( ! $pr->checkNotEmpty("password")) $r="Invalid ini file";
  else if ( ! isset($input["password"]) || empty($input["password"]) ) $r="";//"Missing or empty PASSWORD";
  else if ( $input["realm"] != $pr->g("realm") ) $r="Mismatching REALM";
  else if ( $input["password"] != $pr->g("password") ) $r="Wrong login or password or both";
  if ($r !== true) throw new NoCredentialsException($r);
}

function version($fn) {
  if ( ! class_exists("AssetsVersionMonitor")) return $fn;
  else return AssetsVersionMonitor::addVersion($fn);
}
