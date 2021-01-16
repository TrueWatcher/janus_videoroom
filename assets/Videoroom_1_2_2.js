// https://github.com/meetecho/janus-gateway/blob/master/html/videoroomtest.js
//
"use strict";

jv.Videoroom=function() {

var vw,
    testCount=0,
    server = null,
    janus = null,
    sfutest = null,
    opaqueId = "videoroomtest-"+Janus.randomString(12),
    myroom = 9999,// nonexistent  //1234;	// Demo room
    myusername = null,
    myid = null,
    mystream = null,
    mypvtid = null, // We use this other ID just to map our subscriptions to us
    feeds = [],
    stashedPublisherList = null,
    publisherCount = -1,
    maxPublisherCount = null,
    isPublished =-1,
    doSimulcast =  false,//(getQueryStringValue("simulcast") === "yes" || getQueryStringValue("simulcast") === "true");
    doSimulcast2 = false,//(getQueryStringValue("simulcast2") === "yes" || getQueryStringValue("simulcast2") === "true");
    subscriber_mode = false,//(getQueryStringValue("subscriber-mode") === "yes" || getQueryStringValue("subscriber-mode") === "true");
    iceServers=[{ "urls" : "stun:stun.l.google.com:19302" }]
;

//$(document).ready(run);

function init(sp, aView) {
  server = "wss://"+window.location.hostname+":"+sp.wsServerPort+"/janus-ws";
  opaqueId = "videoroomtest-"+Janus.randomString(12);
  myroom = parseInt(sp.roomId);
  maxPublisherCount = sp.maxPublisherCount;
  //if (getQueryStringValue("room") !== "") myroom = parseInt(getQueryStringValue("room"));
  doSimulcast =  false;//(getQueryStringValue("simulcast") === "yes" || getQueryStringValue("simulcast") === "true");
  doSimulcast2 = false;//(getQueryStringValue("simulcast2") === "yes" || getQueryStringValue("simulcast2") === "true");
  subscriber_mode = false;//(getQueryStringValue("subscriber-mode") === "yes" || getQueryStringValue("subscriber-mode") === "true");
  myusername = sp.user;
  if (sp.turnPort && sp.turnUser && sp.turnCredential) {
    iceServers=addIceServers(iceServers, sp.turnPort, window.location.hostname, sp.turnUser, sp.turnCredential);
  }
  
  vw=aView;
  vw.init( sp, { unpublishOwnFeed: unpublishOwnFeed, toggleMute: toggleMute, publishOwnFeed: publishOwnFeed, sendChatMessage: sendChatMessage, die: die } );
  vw.adoptPublishedState(isPublished);
  vw.adjustLayout();
  window.onresize=function() { 
    jv.screenParams=jv.utils.getScreenParams(); 
    vw.adjustLayout(); 
  };
}

function addIceServers(iceServers,port,domain,username,credential) {
  var item1,item2;
  item2=item1={ urls: null, username: username, credential: credential };
  item1.urls="turn:"+domain+":"+port+"?transport=udp";
  item2.urls="turn:"+domain+":"+port+"?transport=tcp";
  iceServers.push(item1); 
  //iceServers.push(item2);
  return iceServers;
}

function run() {
  Janus.init({
    debug: "all",
    
    callback:
    function createSessionFast() {
      if ( ! Janus.isWebrtcSupported()) {
        vw.alert("No WebRTC support... ");
        throw new Error("No WebRTC support");
        return;
      }
      // Create session
      var params={
        server: server,
        iceServers: iceServers,
        success: attachAsPublisher,
        error: function(error) {
          Janus.error(error);
          vw.alert("Janus error:"+error, function() {
            /*window.location.reload();*/
          });
        },
        destroyed: function() { /*window.location.reload();*/ }
      };
      janus = new Janus(params);
    }// end createSessionFast
  });
}

function attachAsPublisher() {
  // Attach to VideoRoom plugin
  janus.attach({
      plugin: "janus.plugin.videoroom",
      opaqueId: opaqueId,
      success: function(pluginHandle) {
        //$('#details').remove();
        sfutest = pluginHandle;
        Janus.log("Plugin attached! (" + sfutest.getPlugin() + ", id=" + sfutest.getId() + ")");
        Janus.log("  -- This is a publisher/manager");
        
        vw.redefineExit();
        sendJoinPublisherRequest();
      },
      error: function(error) {
        Janus.error("  -- Error attaching plugin...", error);
        vw.alert("Error attaching plugin... " + error);
      },
      consentDialog: onConsentDialog,
      iceState: function(state) { Janus.log("ICE state changed to " + state); },
      mediaState: function(medium, on) { Janus.log("Janus " + (on ? "started" : "stopped") + " receiving our " + medium); },
      webrtcState: function(on) {
        Janus.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
        if ( ! on) return;
        // publisherCount : oneself is not counted !
        isPublished=1;
        vw.adoptPublishedState(isPublished);
        vw.alert(false);
        
        // This controls allows us to override the global room bitrate cap
        //$('#bitrate').parent().parent().removeClass('hide').show();
        //setBitrateCap();
      },
      onmessage: function(msg, jsep) {
        Janus.debug(" ::: Got a message (publisher) :::", msg);
        var event = msg["videoroom"];
        Janus.debug("Event: " + event);
        if (event) {
          if (event === "joined") {
            // Publisher/manager created, negotiate WebRTC and attach to existing feeds, if any
            myid = msg["id"];
            mypvtid = msg["private_id"];
            Janus.log("Successfully joined room " + msg["room"] + " with ID " + myid);
            if ( ! subscriber_mode) {
              publishOwnFeed(true);
            }
            // Any new feed to attach to?
            if (msg["publishers"]) {
              // no mystream - no getUserMedia - no autoplay - grief
              if (isPublished >= 0) followAllPublishers(msg["publishers"]);
              else stashedPublisherList=msg["publishers"];
            }
          }
          else if (event === "destroyed") {
            // The room has been destroyed
            Janus.warn("The room has been destroyed!");
            vw.alert("The room has been destroyed", function() {
              window.location.reload();
            });
          }
          else if (event === "event") {
            // Any new feed to attach to?
            if (msg["publishers"]) {
              if (isPublished >= 0) followAllPublishers(msg["publishers"]);
              else stashedPublisherList=msg["publishers"];
            } 
            else if (msg["leaving"]) {
              detachFeed(msg["leaving"]);
            }
            else if (msg["unpublished"]) {
              if (msg["unpublished"] === 'ok') {
                // That's us who is unpublished
                sfutest.hangup();
                return;
              }
              detachFeed(msg["unpublished"]);
            } 
            else if (msg["error"]) {
              if(msg["error_code"] === 426) {
                // This is a "no such room" error: give a more meaningful description
                vw.alert("Unknown room number:"+myroom);
              }
              else {
                vw.alert("Got an error message:"+msg["error"]);
              }
            }
          }
        }
        if (jsep) {
          Janus.debug("Handling SDP as well...", jsep);
          sfutest.handleRemoteJsep({ jsep: jsep });
          // Check if any of the media we wanted to publish has
          // been rejected (e.g., wrong or unsupported codec)
          var audio = msg["audio_codec"];
          if (mystream && mystream.getAudioTracks() && mystream.getAudioTracks().length > 0 && !audio) {
            // Audio has been rejected
            toastr.warning("Our audio stream has been rejected, viewers won't hear us");
          }
          var video = msg["video_codec"];
          if (mystream && mystream.getVideoTracks() && mystream.getVideoTracks().length > 0 && !video) {
            // Video has been rejected
            vw.capVideo("local");
            toastr.warning("Our video stream has been rejected, viewers won't see us");
          }
        }
      },
      onlocalstream: function(stream) {
        Janus.debug(" ::: Got a local stream :::", stream);
        jv.utils.checkAutoplay("assets/i30_open.mp3");
        mystream = stream;
        if (stashedPublisherList) {
          followAllPublishers(stashedPublisherList);
          stashedPublisherList=null;
        }
        if (publisherCount >= maxPublisherCount) {
          vw.alert("Sorry, our room is full ("+maxPublisherCount+" publishers), you can only watch");
          console.log("Sorry, our room is full ("+maxPublisherCount+" publishers), you can only watch");
          isPublished=0;
          vw.adoptPublishedState(isPublished);
          mystream = null;
          sfutest.hangup();
          return;
        }
        
        vw.adoptVideo(mystream,"local");

        if(sfutest.webrtcStuff.pc.iceConnectionState !== "completed" &&
            sfutest.webrtcStuff.pc.iceConnectionState !== "connected") {}
        var videoTracks = stream.getVideoTracks();
        if (!videoTracks || videoTracks.length === 0) {
          // No webcam
          vw.capVideo("local");
        }
        else { vw.uncapVideo("local"); }
      },
      onremotestream: function(stream) {
        // The publisher stream is sendonly, we don't expect anything here
      },
      oncleanup: function() {
        Janus.log(" ::: Got a cleanup notification: we are unpublished now :::");
        isPublished=0;
        vw.adoptPublishedState(isPublished);
        //publisherCount : oneself is not counted !
        if (mystream) { mystream = null; }  
        vw.removeVideo("local");
        vw.alert(false);
      }
    });
}

function sendJoinPublisherRequest() {
  var register = {
    request: "join",
    room: myroom,
    ptype: "publisher",
    display: myusername
  };
  sfutest.send({ message: register });
}

function setBitrateCap() {
// just copied -- has to be rewritten and tested to be useful
  $('#bitrate a').click(function() {
    var id = $(this).attr("id");
    var bitrate = parseInt(id)*1000;
    if(bitrate === 0) {
      Janus.log("Not limiting bandwidth via REMB");
    } else {
      Janus.log("Capping bandwidth to " + bitrate + " via REMB");
    }
    $('#bitrateset').html($(this).html() + '<span class="caret"></span>').parent().removeClass('open');
    sfutest.send({ message: { request: "configure", bitrate: bitrate }});
    return false;
  });
}

function followAllPublishers(list) {
  //Janus.debug("Got a list of available publishers/feeds:", list);
  console.log("Got a list of available publishers/feeds:"+jv.utils.dumpArray(list));
  publisherCount=list.length;
  if (publisherCount > maxPublisherCount) {
    console.log("Publisher list trimmed from "+publisherCount+" to "+maxPublisherCount);
    list=list.slice(0,maxPublisherCount);
    publisherCount=maxPublisherCount;
  }
  for (var f in list) {
    var id = list[f]["id"];
    var display = list[f]["display"];
    var audio = list[f]["audio_codec"];
    var video = list[f]["video_codec"];
    Janus.debug("  >> [" + id + "] " + display + " (audio: " + audio + ", video: " + video + ")");
    newRemoteFeed(id, display, audio, video);
  }
}

function detachFeed(unpublished) {
  Janus.log("Publisher left: " + unpublished);
  var remoteFeed = null;
  for (var i=1; i<6; i++) {
    if (feeds[i] && feeds[i].rfid == unpublished) {
      remoteFeed = feeds[i];
      break;
    }
  }
  if (remoteFeed != null) {
    Janus.debug("Feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") has left the room, detaching");
    vw.removeVideo(remoteFeed);
    feeds[remoteFeed.rfindex] = null;
    remoteFeed.detach();
    publisherCount -= 1;
  }
}

function publishOwnFeed(useAudio) {
	if (publisherCount >= maxPublisherCount && isPublished >= 0) {
  // if isPublished < 0 we must proceed and obtain a local stream to allow autoplay
    vw.alert("Sorry, our room is full ("+maxPublisherCount+" publishers), you can only watch");
    console.log("Sorry, our room is full ("+maxPublisherCount+" publishers), you can only watch");
    return;
  }
  // Publish our stream via webrtc
  sfutest.createOffer(
		{
			// Add data:true here if you want to publish datachannels as well
			media: { audioRecv: false, videoRecv: false, audioSend: useAudio, videoSend: true, data:true },	// Publishers are sendonly
			// If you want to test simulcasting (Chrome and Firefox only), then
			// pass a ?simulcast=true when opening this demo page: it will turn
			// the following 'simulcast' property to pass to janus.js to true
			simulcast: doSimulcast,
			simulcast2: doSimulcast2,
			success: function(jsep) {
				Janus.debug("Got publisher SDP!", jsep);
				var publish = { request: "configure", audio: useAudio, video: true };
				// You can force a specific codec to use when publishing by using the
				// audiocodec and videocodec properties, for instance:
				// 		publish["audiocodec"] = "opus"
				// to force Opus as the audio codec to use, or:
				// 		publish["videocodec"] = "vp9"
				// to force VP9 as the videocodec to use. In both case, though, forcing
				// a codec will only work if: (1) the codec is actually in the SDP (and
				// so the browser supports it), and (2) the codec is in the list of
				// allowed codecs in a room. With respect to the point (2) above,
				// refer to the text in janus.plugin.videoroom.jcfg for more details
				sfutest.send({ message: publish, jsep: jsep });
			},
			error: function(error) {
				Janus.error("WebRTC error:", error);
        vw.alert("WebRTC error:", error.message || error);
				if (useAudio) {
					 publishOwnFeed(false);
				}
				else {
					vw.alert("WebRTC error... " + error.message);
				}
			}
		});
}

function toggleMute() {
	var muted = sfutest.isAudioMuted();
	Janus.log((muted ? "Unmuting" : "Muting") + " local stream...");
	if (muted) {
		sfutest.unmuteAudio();
    vw.muteIndicator.off();
  }
	else {
		sfutest.muteAudio();
    vw.muteIndicator.on();
  }
	muted = sfutest.isAudioMuted();
}

function unpublishOwnFeed() {
	var unpublish = { request: "unpublish" };
	sfutest.send({ message: unpublish });
}

function newRemoteFeed(id, display, audio, video) {
	// A new feed has been published, create a new plugin handle and attach to it as a subscriber
	var remoteFeed = null;
	janus.attach(
		{
			plugin: "janus.plugin.videoroom",
			opaqueId: opaqueId,
			success: function(pluginHandle) {
				remoteFeed = pluginHandle;
				remoteFeed.simulcastStarted = false;
				Janus.log("Plugin attached! (" + remoteFeed.getPlugin() + ", id=" + remoteFeed.getId() + ")");
				Janus.log("  -- This is a subscriber");
				// We wait for the plugin to send us an offer
				var subscribe = {
					request: "join",
					room: myroom,
					ptype: "subscriber",
					feed: id,
					private_id: mypvtid
				};
				// In case you don't want to receive audio, video or data, even if the
				// publisher is sending them, set the 'offer_audio', 'offer_video' or
				// 'offer_data' properties to false (they're true by default), e.g.:
				// 		subscribe["offer_video"] = false;
				// For example, if the publisher is VP8 and this is Safari, let's avoid video
				if (Janus.webRTCAdapter.browserDetails.browser === "safari" &&
						(video === "vp9" || (video === "vp8" && !Janus.safariVp8))) {
					if (video)
						video = video.toUpperCase()
					toastr.warning("Publisher is using " + video + ", but Safari doesn't support it: disabling video");
					subscribe["offer_video"] = false;
				}
				remoteFeed.videoCodec = video;
				remoteFeed.send({ message: subscribe });
			},
			error: function(error) {
				Janus.error("  -- Error attaching plugin...", error);
				vw.alert("Error attaching plugin... " + error);
			},
			onmessage: function(msg, jsep) {
				Janus.debug(" ::: Got a message (subscriber) :::", msg);
				var event = msg["videoroom"];
				Janus.debug("Event: " + event);
				if (msg["error"]) {
					vw.alert(msg["error"]);
				}
				else if (event) {
					if (event === "attached") {
						// Subscriber created and attached
						for (var i=1; i<6; i++) {
							if( ! feeds[i]) {
								feeds[i] = remoteFeed;
								remoteFeed.rfindex = i;
								break;
							}
						}
						remoteFeed.rfid = msg["id"];
						remoteFeed.rfdisplay = msg["display"];
						Janus.log("Successfully attached to feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") in room " + msg["room"]);
					}
					else if (event === "event") {
						// Check if we got a simulcast-related event from this publisher
						var substream = msg["substream"];
						var temporal = msg["temporal"];
						if ((substream !== null && substream !== undefined) || (temporal !== null && temporal !== undefined)) {
							if ( ! remoteFeed.simulcastStarted) {
								remoteFeed.simulcastStarted = true;
								// Add some new buttons
								addSimulcastButtons(remoteFeed.rfindex, remoteFeed.videoCodec === "vp8" || remoteFeed.videoCodec === "h264");
							}
							// We just received notice that there's been a switch, update the buttons
							updateSimulcastButtons(remoteFeed.rfindex, substream, temporal);
						}
					}
					else {
						// What has just happened?
					}
				}
				if (jsep) {
					Janus.debug("Handling SDP as well...", jsep);
					// Answer and attach
					remoteFeed.createAnswer(
						{
							jsep: jsep,
							// Add data:true here if you want to subscribe to datachannels as well
							// (obviously only works if the publisher offered them in the first place)
							media: { audioSend: false, videoSend: false, data: true },	// We want recvonly audio/video
							success: function(jsep) {
								Janus.debug("Got SDP!", jsep);
								var body = { request: "start", room: myroom };
								remoteFeed.send({ message: body, jsep: jsep });
							},
							error: function(error) {
								Janus.error("WebRTC error:", error);
								vw.alert("WebRTC error... " + error.message);
							}
						});
				}
			},
			iceState: function(state) {
				Janus.log("ICE state of this WebRTC PeerConnection (feed #" + remoteFeed.rfindex + ") changed to " + state);
			},
			webrtcState: function(on) {
				Janus.log("Janus says this WebRTC PeerConnection (feed #" + remoteFeed.rfindex + ") is " + (on ? "up" : "down") + " now");
			},
			onlocalstream: function(stream) {
				// The subscriber stream is recvonly, we don't expect anything here
			},
			onremotestream: function(stream) {
				Janus.debug("Remote feed #" + remoteFeed.rfindex + ", stream:", stream);
        
        vw.adoptVideo(stream,remoteFeed,display);
				
				var videoTracks = stream.getVideoTracks();
				if ( ! videoTracks || videoTracks.length === 0) { vw.capVideo(remoteFeed); }
				else { vw.uncapVideo(remoteFeed); }
			},
      ondata: function(data) { receiveData(data); },
			oncleanup: function() {
				Janus.log(" ::: Got a cleanup notification (remote feed " + id + ") :::");
        vw.removeVideo(remoteFeed);
				remoteFeed.simulcastStarted = false;
			}
		});
}

function receiveData(data) {
  var dataObj=null,
      err="Failed to receive data";
      
  if (typeof data === "object") dataObj=data;  
  else {
    try { dataObj=JSON.parse(data); }
    catch (e) { err="Unparsable data:"+data; }
  }  
  if (dataObj) vw.addToChat(dataObj);//jv.utils.dumpArray(data)
  else vw.alert(err);
}

function sendChatMessage(str) {
  if ( ! sfutest) return;
  var m={ type: "chatMessage", message: str, from: myusername };
  sfutest.data({
    text: JSON.stringify(m),
    success: function() { vw.addToChat(m); }
  });
}

// Helper to parse query string
function getQueryStringValue(name) {
	name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
		results = regex.exec(location.search);
	return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

// Helpers to create Simulcast-related UI, if enabled
function addSimulcastButtons(feed, temporal) {}

function updateSimulcastButtons(feed, substream, temporal) {}

function onConsentDialog(on) {}

// debugging tools
function add() {
  $$("addBtn").style.display="none";
  $$("testBtn").style.display="none";
  $$("addBtn").onclick=function() {
    var stream=mystream;
    var v1=document.querySelectorAll("#remotevideo1");
    if (v1 && v1[0] && v1[0].srcObject) {
      stream=v1[0].srcObject;
    }
    vw.addVideo(stream,feeds[1]);
    publisherCount += 1;    
  };
  $$("testBtn").onclick=function() {
    switch (testCount) {
      case 0:
        vw.capVideo("local");
        break;
      case 1:
        vw.uncapVideo("local");
        break;
      case 2:
        if ( ! feeds[1]) { console.log("Missing feed"); testCount=0; break; }
        vw.capVideo(feeds[1]);
        break;
      case 3:
        vw.uncapVideo(feeds[1]);
        break;
      default:
        testCount = -1;
    }
    testCount += 1;
  };
  //$$("sendBtn").onclick=function() { sendChatMessage("Hi!!!"); };
}

function die() {
  janus.destroy({ unload: true, cleanupHandles: true });
}

return { init: init, run: run, add: add };

}; // end VideoRoom
