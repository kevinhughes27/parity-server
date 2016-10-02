import _ from 'lodash';

const playValues = {
  "Goals": 10000,
  "Assists": 10000,
  "2nd Assist": 8000,
  "3rd Assist": 0,
  "4th Assist": 0,
  "5th Assist": 0,
  "D-Blocks": 8000,
  "Throwaways": -5000,
  "Drops": -5000,
  "ThrewDrop": -2500,
  "Completions": 1000,
  "Pick-Ups": 0,
  "Catches": 1000,
  "Pulls": 0,
  "Calihan": 0,
  "OPointsFor": 0,
  "OPointsAgainst": 0,
  "DPointsFor": 0,
  "DPointsAgainst": 0
};

let calcSalaries = function(stats) {
  return _.mapValues(stats, function(playerStats, playerName) {
    return {'SalaryDelta': _calcSalary(playerStats)};
  });
}

let _calcSalary = function(stats) {
  let values = _.mapValues(stats, function(value, key) {
    return playValues[key] * value;
  });
  values = _.values(values);
  return _.sum(values);
}

module.exports = calcSalaries;
