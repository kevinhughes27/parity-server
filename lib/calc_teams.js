import _ from 'lodash';

let calcTeams = function(game) {
  let teams = {};

  _.mapKeys(game.teams, (players, team) => {
    _.map(players, (player) => { teams[player] = {Team: team} })
  });

  return teams;
};

module.exports = calcTeams;
