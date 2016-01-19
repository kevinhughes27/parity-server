/*
 *  Parity League Event String Parser
 */


/**
 * Receive the events and calculate the stats for each player
 * @param {Array} events Can be an array of strings (will be split on \t) or arrays
 */
var parser = function(events) {
  var stats = {};

  var isDirectionLeft = false;
  var isLastPointLeft = false;
  var isLastEventPoint = false;

  var switchingDirectionEvents = [];
  var endOfDirectionEvents = [];
  var passingEvents = [];

  events.forEach(function(e) {
    e = prepareEvent_(e);

    if(e === undefined || e === []) {
      return;
    };

    if(isSwitchingDirectionEvent(e[0])) {
      switchingDirectionEvents.push(e);
    } else if (isEndOfDirectionEvent(e[0])) {
      endOfDirectionEvents.push(e.slice(0, 2));
      passingEvents.push(e.slice(2, e.length));
    };
  });

  // switchingDirectionEvents
  for ( var i in switchingDirectionEvents ) {
    switch (switchingDirectionEvents[i][0].toString()) {
      case "Pull":
        addEvent_(switchingDirectionEvents[i][1], "Pulls", 1, stats);
        isLastPointLeft = (switchingDirectionEvents[parseInt(i)+1][1] == ">>>>>>");
        break;

      case "D":
        addEvent_(switchingDirectionEvents[i][1], "D-Blocks", 1, stats);
        break;

      // for Points for and Against
      case '1':
      case '+1':
        if (isLastPointLeft == isDirectionLeft)
          addEvent_(switchingDirectionEvents[i][1], "DPointsFor", 1, stats);
        else
          addEvent_(switchingDirectionEvents[i][1], "OPointsFor", 1, stats);
        isLastEventPoint = true;
        break;

      case '-1':
        if (isLastPointLeft == isDirectionLeft)
          addEvent_(switchingDirectionEvents[i][1],"OPointsAgainst", 1, stats);
        else
          addEvent_(switchingDirectionEvents[i][1],"DPointsAgainst", 1, stats);
        isLastEventPoint = true;
        break;

      case "Direction":
        if (isLastEventPoint) {
          isLastEventPoint = false;
          isLastPointLeft = isDirectionLeft;
        }
        isDirectionLeft = (switchingDirectionEvents[i][1] == "<<<<<<");
    }
  }

  // endOfDirectionEvents
  for ( var i in endOfDirectionEvents ) {
    switch (endOfDirectionEvents[i][0]) {
      case "POINT":  //on point +1 POINT +1 Catch +1 Assist +1 Throw +1 2nd-5th Assist +1 possible Calihan
        addEvent_(endOfDirectionEvents[i][1],"Goals", 1, stats);
        addEvent_(endOfDirectionEvents[i][1],"Catches", 1, stats);
        if (passingEvents[i][1] && passingEvents[i][1] != "") {
          addEvent_(passingEvents[i][1],"Assists", 1, stats);
          addEvent_(passingEvents[i][1],"Completions", 1, stats);
        } else {
          addEvent_(endOfDirectionEvents[i][1],"Calihan", 1, stats);
        }
        addEvent_(passingEvents[i][3],"2nd Assist", 1, stats);
        addEvent_(passingEvents[i][5],"3rd Assist", 1, stats);
        addEvent_(passingEvents[i][7],"4th Assist", 1, stats);
        addEvent_(passingEvents[i][9],"5th Assist", 1, stats);
        break;

      case "Throw Away": // on Throw Away +1 Throw Away +1 Catch
        addEvent_(endOfDirectionEvents[i][1],"Throwaways", 1, stats);
        if (passingEvents[i][1] != "") {
          addEvent_(endOfDirectionEvents[i][1],"Catches", 1, stats);
          addEvent_(passingEvents[i][1],"Completions", 1, stats);
        } else {
          addEvent_(endOfDirectionEvents[i][1],"Pick-Ups", 1, stats);
        }
        break;

      case "Drop":  // on Drop +1 Drop +1 Throw Drop
        addEvent_(endOfDirectionEvents[i][1],"Drops", 1, stats);
        addEvent_(passingEvents[i][1],"ThrewDrop", 1, stats);
        break;
    }
  }

  // passingEvents
  for ( var i in passingEvents ) {
    for ( var j = 0; j < passingEvents[0].length; j += 2) {
      switch (passingEvents[i][j]) {
        case "Pass":
          if (passingEvents[i][j+2] == "" || passingEvents[i][j+2] === undefined) {
            addEvent_(passingEvents[i][j+1],"Pick-Ups", 1, stats);
          } else {
            addEvent_(passingEvents[i][j+1],"Catches", 1, stats);
            addEvent_(passingEvents[i][j+3],"Completions", 1, stats);
          }
          break;
      }
    }
  }

  return stats;
};

function isSwitchingDirectionEvent(token) {
  return token == 'Direction' ||
         token == 'D' ||
         token == 'Pull' ||
         token == "1" ||
         token == "+1" ||
         token == "-1"
}

function isEndOfDirectionEvent(token) {
  return token == 'POINT' ||
         token == 'Drop' ||
         token == 'Throw Away'
}

function prepareEvent_(e) {
  if(typeof e === 'string') {
    e = e.trim();
    e = e.split('\t');
    return e;
  } else /* isArray */ {
    return e.filter(function(c){ return c != "" });
  };
};

function addEvent_(player, event, number, stats) {
  if (player == "" || player === undefined || player === null) return;

  if ( !(player in stats) ) {
    stats[player] = initializePlayer_();
  };

  stats[player][event] = stats[player][event] + number;
};

function initializePlayer_() {
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
  player["OPointsFor"] = 0;
  player["OPointsAgainst"] = 0;
  player["DPointsFor"] = 0;
  player["DPointsAgainst"] = 0;

  return player;
};

// Export if we're in a CommonJS env (e.g. Node).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = parser;
}
