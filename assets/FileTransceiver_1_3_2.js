"use strict";

jv.FileTransceiver=function(vw,sfutest,myusername) {
  // TRANSMITTER -------------------------------------------------
  // https://github.com/nterreri/p2p-file-transfer/blob/master/public/signaling/Offerer.js  
  
  var chunkCount=0, sendSize, txFileData=null, file;
  
  function send(aFile) {
    if ( ! aFile instanceof File) throw new Error("Not a File");
    if ( ! aFile.size) {
      vw.chatAlert("Empty or unreadable file "+file.name);
      return;
    }
    file=aFile;// copy the pointer because original may be cleared
    aFile=null;
    var m={ type: "fileData", from: myusername, name: file.name, size: file.size };
    sfutest.data({
      text: JSON.stringify(m),
      success: function() {
        txFileData=m;
        m.message="sending file: "+file.name+" of "+file.size+"B";
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
        //sendEof(txFileData); // may be abortive if sent while data are queued at server
        chunks=[];
        file=null;
        txFileData=null;
      } );
  }

  function sendChunkAsync(chunk) {
    return readAsArrayBufferAsync(chunk).then( function(arrayBuffer) {
      sendBinary(arrayBuffer);
      chunkCount += 1;
      vw.chatAlert("sent "+Math.round(100*chunkCount/sendSize)+" %",true);
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
  
  function sendEof(data) {    
    var m={ type: "fileEnd", from: myusername, name: data.name, size: data.size };
    sfutest.data({ text: JSON.stringify(m) });
  }
  
  // RECEIVER -------------------------------------------------------------
  // https://github.com/nterreri/p2p-file-transfer/blob/master/public/signaling/Answerer.js
  
  var fileData = null, isBusy=false, receivedBytes=0, chunks=[], err=null, dataObj=null;
  
  function tryReceiveData(data) {
    if (typeof data === "object") {
      if ( ! isBusy) {
        vw.chatAlert("Binary data without header");
        return true;
      }
      adoptChunk(data);
      return true;
    }
    else {
      try { dataObj=JSON.parse(data); }
      catch (e) { err="Unparsable data:"+data; }
    }
    if (dataObj.type === "fileData") {
      if (isBusy) {
        vw.chatAlert("File overflow");
        return true;
      }
      adoptMeta(dataObj);
      console.log("Got file data");
      return true;
    }
    if (dataObj.type === "fileEnd") {
      console.log("Got file end");
      if (isBusy) { adoptEof(); }
      return true;
    }
    return false;
  }
  
  function getBusy() { return isBusy; }
  
  function adoptMeta(obj) {
    isBusy=true;
    fileData = obj;
    receivedBytes=0;
    chunks=[];
  }
  
  function adoptChunk(data) {
    if ( ! isBusy) { throw new Error("Receiver not ready -- binary data without info"); }
    if ( ! fileData) { throw new Error("No file data"); }
    //if (data instanceof ArrayBuffer) { console.log("Got an ArrayBuffer"); }
    //if (data instanceof Blob) { console.log("Got a blob"); }
    
    var cs=data.byteLength || data.size;// data may be ArrayBuffer or Blob
    receivedBytes += cs;
    chunks.push(data);
    vw.chatAlert(fileData.name+": "+Math.round(100*receivedBytes/fileData.size)+" % "/*+cs+"B"*/, true);
    if (receivedBytes < fileData.size) { return; }
    deliverFile();
  }
  
  function deliverFile() {
    const fileReceived = new Blob(chunks);
    vw.addBlobToChat(fileReceived, fileData.from, fileData);
    fileData=null;
    chunks=[];
    isBusy=false;
    vw.chatAlert("");
  }
  
  function adoptEof(data) {
    if ( ! isBusy) return;
    if ( ! fileData) return;
    if (data.from !== fileData.from || file.name !== fileData.name) return;
    deliverFile();
  }
  
  return { send: send, getBusy: getBusy, tryReceiveData: tryReceiveData }
};
