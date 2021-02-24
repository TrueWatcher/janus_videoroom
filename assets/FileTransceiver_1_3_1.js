"use strict";

jv.FileTransceiver=function(vw,sfutest,myusername) {
  // TRANSMITTER -------------------------------------------------
  // https://github.com/nterreri/p2p-file-transfer/blob/master/public/signaling/Offerer.js  
  
  var chunkCount=0, sendSize;
  
  function send(file) {
    if ( ! file instanceof File) throw new Error("Not a File");
    if ( ! file.size) {
      vw.chatAlert("Empty or unreadable file "+file.name);
      return;
    }
    var m={ type: "fileData", from: myusername, name: file.name, size: file.size };
    sfutest.data({
      text: JSON.stringify(m),
      success: function() {
        m.message="Sending file "+file.name+" of "+file.size+"B";
        vw.addToChat(m);
        doSendFile(file);
      }
    });
  }

  function doSendFile(file) {
    var chunkSize=16384,
        chunks=[], offset=0;
        
    if (file.size < offset + chunkSize) {
      chunkCount=1;
      sendChunkAsync(file);
      return;
    }

    while (file.size > offset) {
      chunks.push(file.slice(offset, offset + chunkSize));
      offset += chunkSize;
    }
    sendSize=chunks.length;
    chunkCount=0;
    Promise.all(chunks.map(sendChunkAsync))
      .then( function() {
        console.info('Finished sending file to peer.');
        vw.chatAlert("");
        chunks=[];
        file=null;
      } );
  }

  function sendChunkAsync(chunk) {
    return readAsArrayBufferAsync(chunk).then( function(arrayBuffer) {
      sendBinary(arrayBuffer);
      chunkCount += 1;
      vw.chatAlert(Math.round(100*chunkCount/sendSize)+" %",true);
      //console.log('File chunk of size', arrayBuffer.byteLength, 'was sent to peer.');
      return Promise.resolve();
    });
  }

  function readAsArrayBufferAsync(chunk) {
    // Data must be sent as ArrayBuffer instances
    return new Promise( function(resolve) {
      const fileReader = new FileReader();
      fileReader.onload = (e) => resolve(e.target.result);
      fileReader.readAsArrayBuffer(chunk);
    });
  }

  function sendBinary(ab) {
    if ( ! sfutest) return;
    if ( ! (ab instanceof ArrayBuffer)) throw new Error("Not an ArrayBuffer");
    sfutest.data({ data: ab, success: function() {} });
  }
  
  // RECEIVER -------------------------------------------------------------
  // https://github.com/nterreri/p2p-file-transfer/blob/master/public/signaling/Answerer.js
  
  var fileData = null, isBusy=false, receivedBytes=0, chunks=[];
  
  function getBusy() { return isBusy; }
  
  function adoptMeta(obj) {
    isBusy=true;
    fileData = obj;
    receivedBytes=0;
    chunks=[];
  }
  
  function adoptChunk(data) {
    if ( ! isBusy) throw new Error("Receiver not ready -- binary data without info");
    if ( ! fileData) {
      console.log("No file data");
      fileData={ from: "unknown", name: "unknown.txt", size: data.size };
    }
    //if (data instanceof ArrayBuffer) { console.log("Got an ArrayBuffer"); }
    //if (data instanceof Blob) { console.log("Got a blob"); }
    
    var cs=data.byteLength || data.size;// data may be ArrayBuffer or Blob
    receivedBytes += cs;
    chunks.push(data);
    vw.chatAlert(fileData.name+": "+Math.round(100*receivedBytes/fileData.size)+" % "/*+cs+"B"*/, true);
    if (receivedBytes < fileData.size) { return; }
    
    const fileReceived = new Blob(chunks);
    vw.addBlobToChat(fileReceived, fileData.from, fileData);
    fileData=null;
    chunks=[];
    isBusy=false;
    vw.chatAlert("");
  }
  
  return { send: send, getBusy: getBusy, adoptMeta: adoptMeta, adoptChunk: adoptChunk }
};
