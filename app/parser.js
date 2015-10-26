/*
 *  Parity League Event String Parser
 */

exports.parser = function(events) {

  var stats = {};

  var switchingDirectionEvents = [];
  var endOfDirectionEvents = [];
  var passingEvents = [];

  events.forEach(function(e) {
    e = e.trim();
    e = e.split('\t');

    if( e[0] == 'Direction' || e[0] == 'D' || e[0] == 'Pull') {
      switchingDirectionEvents.push(e);
    } else if ( e[0] == 'POINT' || e[0] == 'Drop' || e[0] == 'Throw Away' ) {
      endOfDirectionEvents.push(e.slice(0, 2));
      passingEvents.push(e.slice(2, -1));
    };
  });

  // switchingDirectionEvents
  for ( var i in switchingDirectionEvents ) {
    switch (switchingDirectionEvents[i][0]) {
      case "Pull":
        addEvent(switchingDirectionEvents[i][1],"Pulls",1, stats);
        break;
      case "D":
        addEvent(switchingDirectionEvents[i][1],"D-Blocks",1, stats);
        break;
    }
  }

  // endOfDirectionEvents
  for ( var i in endOfDirectionEvents ) {
    switch (endOfDirectionEvents[i][0]) {
      case "POINT":  //on point +1 POINT +1 Catch +1 Assist +1 Throw +1 2nd-5th Assist +1 possible Calihan
        addEvent(endOfDirectionEvents[i][1],"Goals", 1, stats);
        addEvent(endOfDirectionEvents[i][1],"Catches", 1, stats);
        if (passingEvents[i][1] != "") {
          addEvent(passingEvents[i][1],"Assists", 1, stats);
          addEvent(passingEvents[i][1],"Completions", 1, stats);
        }else{
          addEvent(endOfDirectionEvents[i][1],"Calihan", 1, stats);
        }
        addEvent(passingEvents[i][3],"2nd Assist", 1, stats);
        addEvent(passingEvents[i][5],"3rd Assist", 1, stats);
        addEvent(passingEvents[i][7],"4th Assist", 1, stats);
        addEvent(passingEvents[i][9],"5th Assist", 1, stats);

        break;
      case "Throw Away": // on Throw Away +1 Throw Away +1 Catch
        addEvent(endOfDirectionEvents[i][1],"Throwaways", 1, stats);
        if (passingEvents[i][1] != "") {
          addEvent(endOfDirectionEvents[i][1],"Catches", 1, stats);
          addEvent(passingEvents[i][1],"Completions", 1, stats);
        }else{
          addEvent(endOfDirectionEvents[i][1],"Pick-Ups", 1, stats);
        }
        break;
      case "Drop":  // on Drop +1 Drop +1 Throw Drop
        addEvent(endOfDirectionEvents[i][1],"Drops", 1, stats);
        addEvent(passingEvents[i][1],"ThrewDrop", 1, stats);
        break;
    }
  }

  // passingEvents
  for ( var i in passingEvents ) {
    for ( var j = 0; j < passingEvents[0].length; j += 2) {
      switch (passingEvents[i][j]) {
        case "Pass":
          if (passingEvents[i][j+2] == "" || passingEvents[i][j+2] === undefined) {
            addEvent(passingEvents[i][j+1],"Pick-Ups", 1, stats);
          }else{
            addEvent(passingEvents[i][j+1],"Catches", 1, stats);
            addEvent(passingEvents[i][j+3],"Completions", 1, stats);
          }
          break;
      }
    }
  }

  return stats;
};

function addEvent(player, event, number, stats) {
  if (player == "" || player === undefined || player === null) return;

  if ( !(player in stats) ) {
    stats[player] = initializePlayer();
  };

  stats[player][event] = stats[player][event] + number;
};

function initializePlayer() {
  var player = {};

  player["Goals"] = 0;
  player["Assists"] = 0;
  player["2nd Assist"] = 0;
  player["3rd Assist"] = 0;
  player["4th Assist"] = 0;
  player["5th Assist"] = 0;
  player["D-Blocks"] = 0;
  player["Completions"] = 0;
  player["Throwaways"] = 0;
  player["ThrewDrop"] = 0;
  player["Catches"] = 0;
  player["Drops"] = 0;
  player["Pick-Ups"] = 0;
  player["Pulls"] = 0;
  player["Calihan"] = 0;
  player["PointsFor"] = 0;
  player["PointsAgainst"] = 0;

  return player;
};
