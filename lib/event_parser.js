/**
 * Receive the events and calculates the stats for each player
 * @param {Array} events can be an array of strings (will be split on \t)
 */
let parser = function(events) {
  let stats = {};

  let groupedEvents = groupEvents(events);
  let switchingDirectionEvents = groupedEvents.switchingDirectionEvents;
  let endOfDirectionEvents = groupedEvents.endOfDirectionEvents;
  let passingEvents = groupedEvents.passingEvents;
  let onFieldEvents = groupedEvents.onFieldEvents;

  processSwitchingDirectionEvents(switchingDirectionEvents, stats);
  processEndOfDirectionEvents(endOfDirectionEvents, passingEvents, stats);
  processPassingEvents(passingEvents, stats);
  processOnFieldEvents(onFieldEvents, stats);

  return stats;
};


function processSwitchingDirectionEvents(events, stats) {
  for ( let i in events ) {
    switch (events[i][0]) {

      case "Pull":
        addEvent_(events[i][1], "Pulls", 1, stats);
        break;

      case "D":
        addEvent_(events[i][1], "D-Blocks", 1, stats);
        break;
    }
  }
}

function processEndOfDirectionEvents(endOfDirectionEvents, passingEvents, stats) {
  for ( let i in endOfDirectionEvents ) {
    switch (endOfDirectionEvents[i][0]) {

      // on point +1 POINT +1 Catch +1 Assist +1 Throw +1 2nd-5th Assist +1 possible Calihan
      case "POINT":
        addEvent_(endOfDirectionEvents[i][1], "Goals", 1, stats);
        addEvent_(endOfDirectionEvents[i][1], "Catches", 1, stats);

        if (blank_(passingEvents[i][1])) {
          addEvent_(endOfDirectionEvents[i][1], "Calihan", 1, stats);
        } else {
          addEvent_(passingEvents[i][1], "Assists", 1, stats);
          addEvent_(passingEvents[i][1], "Completions", 1, stats);
        }

        addEvent_(passingEvents[i][3], "2nd Assist", 1, stats);
        addEvent_(passingEvents[i][5], "3rd Assist", 1, stats);
        addEvent_(passingEvents[i][7], "4th Assist", 1, stats);
        addEvent_(passingEvents[i][9], "5th Assist", 1, stats);
        break;

      // on Throw Away +1 Throw Away +1 Catch
      case "Throw Away":
        addEvent_(endOfDirectionEvents[i][1], "Throwaways", 1, stats);

        if (blank_(passingEvents[i][1])) {
          addEvent_(endOfDirectionEvents[i][1], "Pick-Ups", 1, stats);
        } else {
          addEvent_(endOfDirectionEvents[i][1], "Catches", 1, stats);
          addEvent_(passingEvents[i][1], "Completions", 1, stats);
        }
        break;

      // on Drop +1 Drop +1 Throw Drop
      case "Drop":
        addEvent_(endOfDirectionEvents[i][1], "Drops", 1, stats);
        addEvent_(passingEvents[i][1], "ThrewDrop", 1, stats);
        break;
    }
  }
}

function processPassingEvents(events, stats) {
  for ( let i in events ) {
    for ( let j = 0; j < events[i].length; j += 2) {
      if (events[i][j] != 'Pass') continue;

      if (blank_(events[i][j+2])) {
        addEvent_(events[i][j+1], "Pick-Ups", 1, stats);
      } else {
        addEvent_(events[i][j+1], "Catches", 1, stats);
        addEvent_(events[i][j+3], "Completions", 1, stats);
      }
    }
  }
}

function processOnFieldEvents(events, stats) {
  for ( let i in events ) {
    switch (events[i][0]) {

      // Points for and Against
      case 'O+':
        addEvent_(events[i][1], "OPointsFor", 1, stats);
        break;

      case 'O-':
        addEvent_(events[i][1], "OPointsAgainst", 1, stats);
        break;

      case "D+":
        addEvent_(events[i][1], "DPointsFor", 1, stats);
        break;

      case "D-":
        addEvent_(events[i][1], "DPointsAgainst", 1, stats);
        break;
    }
  }
}

function groupEvents(events) {
  let switchingDirectionEvents = [];
  let endOfDirectionEvents = [];
  let passingEvents = [];
  let onFieldEvents = [];

  events.forEach(function(e) {
    e = prepareEvent_(e);

    if (isSwitchingDirectionEvent(e[0])) {
      switchingDirectionEvents.push(e);

    } else if (isEndOfDirectionEvent(e[2])) {
      endOfDirectionEvents.push(e.slice(2, 4));
      passingEvents.push(e.slice(4, e.length));

    } else if (isOnFieldEvent(e[0])) {
      onFieldEvents.push(e.slice(0,2)); // O_ event
      onFieldEvents.push(e.slice(2,4)); // D_ event
    }
  });

  return {
    switchingDirectionEvents: switchingDirectionEvents,
    endOfDirectionEvents: endOfDirectionEvents,
    passingEvents: passingEvents,
    onFieldEvents: onFieldEvents
  };
}

function isSwitchingDirectionEvent(token) {
  return token == 'Pull' ||
         token == 'D'
}

function isEndOfDirectionEvent(token) {
  return token == 'POINT' ||
         token == 'Drop' ||
         token == 'Throw Away'
}

function isOnFieldEvent(token) {
  return token == 'O+' ||
         token == 'O-' ||
         token == 'D+' ||
         token == 'D-'
}

function prepareEvent_(e) {
  e = e.trim();
  e = e.split('\t');
  return e;
};

function blank_(value) {
  return value == "" || value == undefined;
}

function addEvent_(player, event, number, stats) {
  if (blank_(player)) return;

  if ( !(player in stats) ) {
    stats[player] = initializePlayer_();
  };

  stats[player][event] = stats[player][event] + number;
};

function initializePlayer_() {
  let player = {};

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
