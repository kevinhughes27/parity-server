// @flow

import _ from 'lodash'

export default class Stats {
  data: any

  constructor (data: any) {
    this.data = data
  }

  toArray () {
    return _.map(_.keys(this.data), (k) => {
      return { name: k, ...this.data[k] }
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

  forPlayer (playerName: string) {
    return this.data[playerName]
  }

  topPlayers (stat: string, num: number) {
    return _.sortBy(this.toArray(), (p) => { return -p[stat] }).slice(0, num)
  }
}
