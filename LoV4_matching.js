
const net = require('net')

var Iconv  = require('iconv').Iconv;
var iconv = new Iconv('UTF-16BE', 'UTF-8//IGNORE');

var stdin = process.openStdin();

class Player {
  constructor() {
  }
}

class GameServer {
  constructor() {
  }
}

var activeGameServers = [];
var playersWaitingMatch = [];

var cCounter = 0;


function startMatch() {
  var server_found = 0;
  var m_server = null;

  console.log("Determining common Level...");
  var commonLevel = 0;
  playersWaitingMatch.forEach(function(elementx) {
    commonLevel += elementx.leaguelevel;
  });
  commonLevel = parseInt(commonLevel/playersWaitingMatch.length);
  commonLevel++;
  console.log("Common Level: " + commonLevel);
  console.log("Looking for a free GameServer...");
  activeGameServers.forEach(function(server) {
      if (server.busy == 0) {
        gserver = server;
        var gserver_ip = server.ip_a.toString() + ".";
        gserver_ip += server.ip_b.toString() + ".";
        gserver_ip += server.ip_c.toString() + ".";
        gserver_ip += server.ip_d.toString() + ":";
        gserver_ip += (server.port_a * 256 + server.port_b).toString();
        console.log("Found available GameServer, " + gserver_ip + " connection ID: "+server.connectionNumber);
        var sMap = 1; // map
        var sPlayers = playersWaitingMatch.length; // number of Players
        server.socket.write(new Buffer([0,1,sPlayers,0,0x0,0x2,0x58,commonLevel,1,0,0,0,1]));
        console.log("Sent map initialization...");
        server_found = 1;
        m_server = server;
      }
  }); // for each
  if (!server_found) {
    console.log("Can't get free GameServer, retrying");
    setTimeout(startMatch, 3000);
    return;
  }


    console.log("Sending MatchingNotify_Match to connected players.");

    var modeVersus = 0;
    var playerPos = 0;
    playersWaitingMatch.forEach(function(elementx) {
      if (elementx.tagID == 55777) modeVersus = 1;
      console.log("Sending to ["+elementx.connectionNumber+"] PlayerID: "+elementx.playerID.toString(16) + " ("+iconv.convert(elementx.playerName)+")");
      if (modeVersus) {
        var pTeam = parseInt(playerPos%2);
        var pGate = parseInt(playerPos/2);
        playerPos++;
        var pPos = pGate*2 + pTeam;
        var pFound = new Buffer([0x0,m_server.ip_a,m_server.ip_b,m_server.ip_c,m_server.ip_d,m_server.port_a,m_server.port_b, pPos ,0,0,0,1,0x32,0x30,0x31,0x39,0x30,0x38,0x32,0x39,1,1]);
      } else {
        var pTeam = 0;
        var pGate = playerPos;
        playerPos++;
        var pPos = pGate*2 + pTeam;
        var pFound = new Buffer([0x0,m_server.ip_a,m_server.ip_b,m_server.ip_c,m_server.ip_d,m_server.port_a,m_server.port_b, pPos ,0,0,0,1,0x32,0x30,0x31,0x39,0x30,0x38,0x32,0x39,1,1]);
      }

      console.log("Sending: "+pFound.toString('hex'));
      elementx.socket.write(pFound);
    });
    playerPos = 0;
}

function notifyPlayers() {
  console.log("Notifing connected players.");
  playersWaitingMatch.forEach(function(elementx) {
      console.log("Sending to ["+elementx.connectionNumber+"] PlayerID: "+elementx.playerID.toString(16) + " ("+iconv.convert(elementx.playerName)+")");

      // Notify about other players, not self.
      var pSelf = elementx.playerID;
      playersWaitingMatch.forEach(function(element) {
        if (pSelf != element.playerID) {

          var pNumChanged = new Buffer([0x1,playersWaitingMatch.length]); // NUMBER!
          elementx.socket.write(pNumChanged);


          var pOut = Buffer(185);
          pOut[0]= 2; // RecvData_tagPartnerAddList
          pOut[1]= element.gamemode;
          pOut.writeUInt32BE(element.leaguelevel,0x2);
          pOut[6]= element.titlerank;
          for (var i=0; i < 32; i++) {
            pOut[i+7] = element.playerName[i];
          }
          for (var i=0; i < 32; i++) {
            pOut[i+39] = element.tenpoName[i];
          }


          pOut.writeUInt32BE(element.playerID,71);
          pOut.writeUInt32BE(element.tagID,75);
          for (var i=0; i < 16; i++) {
            pOut[i+79] = element.prefecture[i];
          }
          for (var i=0; i < 32; i++) {
            pOut[i+95] = element.guild[i];
          }
          pOut[127]= element.avatarID;
          pOut.writeUInt32BE(element.body,128);
          pOut.writeUInt32BE(element.hair,131);
          pOut.writeUInt32BE(element.costume,136);
          pOut.writeUInt32BE(element.accessory,140);
          pOut.writeUInt32BE(element.background,144);
          pOut.writeUInt32BE(element.accessory_a,148);
          pOut.writeUInt32BE(element.accessory_b,152);
          pOut.writeUInt32BE(element.accessory_c,156);
          pOut.writeUInt32BE(element.accessory_d,160);
          pOut.writeUInt32BE(element.plate,164);
          pOut.writeUInt32BE(element.frame,168);
          pOut.writeUInt32BE(element.phrase,172);
          pOut.writeUInt32BE(element.title,176);
          pOut[180]= element.titleType;
          pOut.writeUInt32BE(element.level,181);

          console.log("Sending: "+pOut.toString('hex'));
          elementx.socket.write(pOut);
          var pNumChanged = new Buffer([0x1,playersWaitingMatch.length]); // NUMBER!
          elementx.socket.write(pNumChanged);

        }
      }); // for each

//            console.log(element);
  });

}



net.createServer(socket => {

// Identify this client (GS)
  cCounter++;
  var connectionNumber = cCounter;
  socket.name = socket.remoteAddress + ":" + socket.remotePort

  console.log("["+connectionNumber+"] GameServer " + socket.name + " connected");
  socket.on('data', function(data){
    var hexdata = new Buffer(data, 'ascii').toString('hex');
    console.log("[" + connectionNumber + "] RECEIVED: %s", hexdata)
    if (data[0] == 0x14) {
      // register Server
      var gserver = new GameServer();
      gserver.version = ((data[1]*256+data[2]) * 256 + data[3]) * 256 + data[4];
      gserver.ip_a = data[5];
      gserver.ip_b = data[6];
      gserver.ip_c = data[7];
      gserver.ip_d = data[8];
      gserver.port_a = data[9];
      gserver.port_b = data[10];
      gserver.bundle = "";
      for (var i=0; i < 16; i++) {
        gserver.bundle += data[i+11].toString(16);
      }

      var gserver_ip = gserver.ip_a.toString() + ".";
      gserver_ip += gserver.ip_b.toString() + ".";
      gserver_ip += gserver.ip_c.toString() + ".";
      gserver_ip += gserver.ip_d.toString() + ":";
      gserver_ip += (gserver.port_a * 256 + gserver.port_b).toString();

      gserver.socket = socket;
      gserver.busy = 1;
      gserver.connectionNumber =  connectionNumber;

      console.log("[" + connectionNumber + "] New GameServer connected: "+gserver_ip+"    Bundle ID: "+gserver.bundle);

      activeGameServers.push(gserver);

//      socket.write(new Buffer([0x256]));
//      socket.write(new Buffer([1,2]));
      //socket.write(new Buffer([0,1,1,0,0x1,0xd4,0xc0,1,1,0,0,0,1]));

    } else if (data[0] == 0x01 && data[1] == 0x00) {  // Gameserver ready
      activeGameServers.forEach(function(server) {
        if (server.connectionNumber == connectionNumber) {
          server.busy = 0;
        }
      });
      console.log("[" + connectionNumber + "] Received: Server Ready");
      //socket.write(new Buffer([0,1,2,0,0x0,0x1,0x90,1,1,0,0,0,1]));
      //console.log("[" + connectionNumber + "] Echoing: Switch Map");
    } else if (data[0] == 0x01 && data[1] == 0x01) {  // Gameserver busy
      //socket.write(new Buffer([0xff]));
      activeGameServers.forEach(function(server) {
        if (server.connectionNumber == connectionNumber) {
          server.busy = 1;
        }
      });
      console.log("[" + connectionNumber + "] Received: Server Busy");
    } else {
    //  socket.write(new Buffer([0xff]));
      console.log("[" + connectionNumber + "] Unknown Operation");
    }
//    var hexdata = new Buffer(data, 'ascii').toString('hex');
//    console.log('RECEIVED: %s', hexdata)
//    socket.write(new Buffer([1]));
  })
  socket.on('error', function (err) {
    if (err.code !== 'ECONNRESET') {
        // Ignore ECONNRESET and re throw anything else
        throw err
    }
  })

  socket.on('timeout',function(){
    console.log("[" + connectionNumber + "] Socket timed out !");
    socket.end('Timed out!');
    // can call socket.destroy() here too.
  })

  socket.on('end',function(data){
    console.log("[" + connectionNumber + "] Socket ended from other end!");
    console.log('End data : ' + data);
  })

  socket.on('close',function(error){
    var bread = socket.bytesRead;
    var bwrite = socket.bytesWritten;
    console.log("[" + connectionNumber + "] Bytes read : " + bread);
    console.log("[" + connectionNumber + "] Bytes written : " + bwrite);
    console.log("[" + connectionNumber + "] Socket closed!");

    activeGameServers  = activeGameServers.filter(function(value, index, arr){

        return value.connectionNumber != connectionNumber;

    });


    if(error){
      console.log("[" + connectionNumber + "] Socket was closed on transmission error");
    }
  })
  socket.on('connection', function (client) {
    console.log("[" + connectionNumber + "] Connected ", client)
  })
}).listen(11002,"0.0.0.0")

// #####################################
//
// CLIENT
//
// #####################################

net.createServer(socket => {

// Identify this client (GC)
  cCounter++;
  var connectionNumber = cCounter;
  socket.name = socket.remoteAddress + ":" + socket.remotePort
  console.log("[" + connectionNumber + "] GameClient " + socket.name + " connected");
  socket.on('data', function(data){
    var hexdata = new Buffer(data, 'ascii').toString('hex');
    console.log("[" + connectionNumber + "] RECEIVED: %s", hexdata)
    if (data[0] == 0x0) {

      // request matching
      var gplayer = new Player();
      gplayer.connectionNumber = connectionNumber;
      gplayer.version = ((data[1]*256+data[2]) * 256 + data[3]) * 256 + data[4];
      gplayer.gamemode = data[5];
      gplayer.leaguelevel = ((data[6]*256+data[7]) * 256 + data[8]) * 256 + data[9];
      gplayer.titlerank = data[10];
      gplayer.rankingaverage = data[11]*256 + data[12];
      gplayer.matchid = ((data[13]*256+data[14]) * 256 + data[15]) * 256 + data[16];
      gplayer.matchgate = ((data[17]*256+data[18]) * 256 + data[19]) * 256 + data[20];
      gplayer.bundle = "";
      for (var i=0; i < 16; i++) {
        gplayer.bundle += data[i+21].toString(16);
      }

      gplayer.playerName = new Buffer(32);
      for (var i=0; i < 32; i++) {
        gplayer.playerName[i] = data[i+0x25];
      }
      gplayer.tenpoName = new Buffer(32);
      for (var i=0; i < 32; i++) {
        gplayer.tenpoName[i] = data[i+0x45];
      }
      gplayer.official = ((data[0x65]*256+data[0x66]) * 256 + data[0x67]) * 256 + data[0x68];
      gplayer.matchMode = ((data[0x69]*256+data[0x6a]) * 256 + data[0x6b]) * 256 + data[0x6c];
      gplayer.playerID = ((data[0x6d]*256+data[0x6e]) * 256 + data[0x6f]) * 256 + data[0x70];
      gplayer.tagID = ((data[0x71]*256+data[0x72]) * 256 + data[0x73]) * 256 + data[0x74];


      gplayer.prefecture = new Buffer(16);
      for (var i=0; i < 16; i++) {
        gplayer.prefecture[i] = data[i+0x75];
      }
      gplayer.guild = new Buffer(32);

      for (var i=0; i < 32; i++) {
        gplayer.guild[i] = data[i+0x85];
      }

      gplayer.avatarID = data[0xa5];
      gplayer.body = ((data[0xa6]*256+data[0xa7]) * 256 + data[0xa8]) * 256 + data[0xa9];
      gplayer.hair = ((data[0xaa]*256+data[0xab]) * 256 + data[0xac]) * 256 + data[0xad];
      gplayer.constume = ((data[0xae]*256+data[0xaf]) * 256 + data[0xb0]) * 256 + data[0xb1];
      gplayer.acceesory = ((data[0xb2]*256+data[0xb3]) * 256 + data[0xb4]) * 256 + data[0xb5];
      gplayer.background = ((data[0xb6]*256+data[0xb7]) * 256 + data[0xb8]) * 256 + data[0xb9];


      gplayer.accessory_a = ((data[0xba]*256+data[0xbb]) * 256 + data[0xbc]) * 256 + data[0xbd];
      gplayer.accessory_b = ((data[0xbe]*256+data[0xbf]) * 256 + data[0xc0]) * 256 + data[0xc1];
      gplayer.accessory_c = ((data[0xc2]*256+data[0xc3]) * 256 + data[0xc4]) * 256 + data[0xc5];
      gplayer.accessory_d = ((data[0xc6]*256+data[0xc7]) * 256 + data[0xc8]) * 256 + data[0xc9];

      gplayer.plate = ((data[0xca]*256+data[0xcb]) * 256 + data[0xcc]) * 256 + data[0xcd];
      gplayer.frame = ((data[0xce]*256+data[0xcf]) * 256 + data[0xd0]) * 256 + data[0xd1];
      gplayer.phrase = ((data[0xd2]*256+data[0xd3]) * 256 + data[0xd4]) * 256 + data[0xd5];
      gplayer.title = ((data[0xd6]*256+data[0xd7]) * 256 + data[0xd8]) * 256 + data[0xd9];
      gplayer.titleType = data[0xda];
      gplayer.level = ((data[0xdb]*256+data[0xdc]) * 256 + data[0xdd]) * 256 + data[0xde];

      gplayer.socket = socket;

      console.log("");
      console.log("[" + connectionNumber + "] Bundle ID: "+gplayer.bundle+"   Matching ver:"+gplayer.version);
      console.log("[" + connectionNumber + "] Player: "+iconv.convert(gplayer.playerName)+"    Guild: "+iconv.convert(gplayer.guild));
      console.log("[" + connectionNumber + "] Tenpo: "+iconv.convert(gplayer.tenpoName)+"    Prefecture: "+iconv.convert(gplayer.prefecture));
      console.log("[" + connectionNumber + "] TitleRank: "+gplayer.titlerank.toString(10)+"    RankingAverage: "+gplayer.rankingaverage.toString(10));
      console.log("[" + connectionNumber + "] LeagueLevel: "+gplayer.leaguelevel.toString(10)+"   Official:"+gplayer.official.toString(10));
      console.log("[" + connectionNumber + "] Player ID: " + gplayer.playerID.toString(16)+"    Level: "+(gplayer.level+1));
      console.log("[" + connectionNumber + "] Requested MatchMode: " + gplayer.matchMode.toString(10)+"    TAG ID: "+gplayer.tagID.toString(10));
      console.log("[" + connectionNumber + "] MatchID: " + gplayer.matchid.toString(10)+"    MatchGate: "+gplayer.matchgate.toString(10));
      playersWaitingMatch.push(gplayer);
      console.log("[" + connectionNumber + "] Added player to matching pool...");
      console.log("");
      // Notify others
      notifyPlayers();
      if (playersWaitingMatch.length > 1) setTimeout(startMatch, 8000);
    } else {
  //    socket.write(new Buffer([0xff]));
      console.log('Echoing: keep alive');
    }
//    var hexdata = new Buffer(data, 'ascii').toString('hex');
//    console.log('RECEIVED: %s', hexdata)
//    socket.write(new Buffer([1]));
  })
  socket.on('error', function (err) {
    if (err.code !== 'ECONNRESET') {
        // Ignore ECONNRESET and re throw anything else
        throw err
    }
  })

  socket.on('timeout',function(){
    console.log('Socket timed out !');
    socket.end('Timed out!');
    // can call socket.destroy() here too.
  })

  socket.on('end',function(data){
    console.log('Socket ended from other end!');
    console.log('End data : ' + data);
  })

  socket.on('close',function(error){
    var bread = socket.bytesRead;
    var bwrite = socket.bytesWritten;
    console.log('Bytes read : ' + bread);
    console.log('Bytes written : ' + bwrite);
    console.log('Socket closed!');

    playersWaitingMatch  = playersWaitingMatch.filter(function(value, index, arr){

        return value.connectionNumber != connectionNumber;

    });

    if(error){
      console.log('Socket was closed coz of transmission error');
    }
  })
  socket.on('connection', function (client) {
    console.log("Connected ", client)
  })
}).listen(11001,'0.0.0.0')


stdin.addListener("data", function(d) {
    // note:  d is an object, and when converted to a string it will
    // end with a linefeed.  so we (rather crudely) account for that
    // with toString() and then trim()
    console.log("you entered: [" +
        d.toString().trim() + "]");
    switch (d.toString().trim()) {
      case "start":
        startMatch();
      break;
      case "c":
        console.log("Sending RecvData_confirmConnection to connected players.");
        playersWaitingMatch.forEach(function(elementx) {
          console.log("Sending to ["+elementx.connectionNumber+"] PlayerID: "+elementx.playerID.toString(16) + " ("+iconv.convert(elementx.playerName)+")");
          var pFound = new Buffer([0x6]); //
          elementx.socket.write(pFound);
        });
      break;
      case "b":
        console.log("Sending RecvData_tagPartnerFound to connected players.");
        playersWaitingMatch.forEach(function(elementx) {
            console.log("Sending to ["+elementx.connectionNumber+"] PlayerID: "+elementx.playerID.toString(16) + " ("+iconv.convert(elementx.playerName)+")");
            var pFound = new Buffer([0x4]); //
            elementx.socket.write(pFound);
        });
      break;
      case "notify":
        notifyPlayers();
      break;
      case "help":
        console.log("");
        console.log("notify - Manually send notification about players waiting to match");
        console.log("start  - Manually start match between all connected players");
        console.log("");

      break;
    }
});



console.log("");
console.log("");
console.log("Lord of Vermilion IV matching server ready");
console.log("Game clients port: 11001");
console.log("Game servers port: 11002");
console.log("");
console.log("Type help for commands.");
console.log("");
