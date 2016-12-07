import _ from 'lodash'

export default class Stats {
  constructor (data) {
    this.data = data
  }

  toArray () {
    return _.map(_.keys(this.data), (k) => {
      return { Name: k, ...this.data[k] }
    })
  }

  playerNames () {
    return _.keys(this.data)
  }

  teamNames () {
    let teams = _.uniq(_.map(_.values(this.data), 'Team'))
    _.pull(teams, 'Substitute')
    return teams
  }

  forPlayer (playerName) {
    return this.data[playerName]
  }

  playersFor (team) {
    let players = []
    _.mapKeys(this.data, (playerStats, playerName) => {
      if (playerStats['Team'] === team) {
        players.push({name: playerName, salary: playerStats['Salary']})
      }
    })

    players = _.sortBy(players, (p) => p.salary)

    return players
  }

  applyTrade (playerA, playerB) {
    let teamA = this.data[playerA]['Team']
    let teamB = this.data[playerB]['Team']

    this.data[playerA]['Team'] = teamB
    this.data[playerB]['Team'] = teamA
  }

  teamSalary (team) {
    let players = this.playersFor(team)
    return _.sum(_.map(players, (p) => p.salary))
  }

  averageTeamSalary () {
    let teams = this.teamNames()

    return _.sum(_.map(teams, (t) => {
      return _.sum(_.map(this.playersFor(t), (p) => p.salary))
    })) / teams.length
  }

  salaryCap () {
    return _.floor(this.averageTeamSalary() * 1.01)
  }

  salaryFloor () {
    return _.floor(this.averageTeamSalary() * 0.99)
  }
}
