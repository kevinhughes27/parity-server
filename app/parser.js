/*
 *  Parity League Event String Parser
 */
exports.parser = function(events) {
  return events;
};

function addEvent(person, event, number, data) {
  if (person == "" || person === undefined || person === null) return;

  if ( !(person in data) ) {
    data[person] = initializePerson();
  };

  data[person][event] = data[person][event] + number;
};

function initializePerson() {
  var person = {};

  person["Goals"] = 0;
  person["Assists"] = 0;
  person["2nd Assist"] = 0;
  person["3rd Assist"] = 0;
  person["4th Assist"] = 0;
  person["5th Assist"] = 0;
  person["D-Blocks"] = 0;
  person["Completions"] = 0;
  person["Throwaways"] = 0;
  person["ThrewDrop"] = 0;
  person["Catches"] = 0;
  person["Drops"] = 0;
  person["Pick-Ups"] = 0;
  person["Pulls"] = 0;
  person["Calihan"] = 0;
  person["PointsFor"] = 0;
  person["PointsAgainst"] = 0;

  return person;
};
