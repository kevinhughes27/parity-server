// @flow

import _ from 'lodash'

export default class Stats {
  data: any

  constructor (data: any) {
    this.data = data
  }

  toArray () {
    return _.map(_.keys(this.data), (k) => {
      return { Name: k, ...this.data[k] }
    })
  }

  playersWithStats () {
    return _.filter(this.toArray(), (player) => {
      return _.keys(player).length > 4
    })
  }

  playerNames () {
    return _.keys(this.data)
  }

  teamNames () {
    let teams = _.uniq(_.map(_.values(this.data), 'Team'))
    _.pull(teams, 'Substitute', 'None')
    return _.sortBy(teams, (t) => t.length)
  }

  forPlayer (playerName: string) {
    return this.data[playerName]
  }

  playersFor (team: string) {
    let players = []
    _.mapKeys(this.data, (playerStats, playerName) => {
      if (playerStats['Team'] === team) {
        players.push({name: playerName, salary: playerStats['Salary']})
      }
    })

    players = _.sortBy(players, (p) => p.salary ? p.salary : -1)

    return players
  }

  topPlayers (stat: string, num: number) {
    return _.sortBy(this.toArray(), (p) => { return -p[stat] }).slice(0, num)
  }

  applyTrade (playerA: string, playerB: string) {
    let teamA = this.data[playerA]['Team']
    let teamB = this.data[playerB]['Team']

    this.data[playerA]['Team'] = teamB
    this.data[playerB]['Team'] = teamA
  }

  teamSalary (team: string) {
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
