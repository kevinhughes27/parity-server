// @flow

import _ from 'lodash'
import React, { Component } from 'react'
import PlayerSelect from './PlayerSelect'
import PlayerGraph from './PlayerGraph'

const STATS = [
  'Goals',
  'Assists',
  '2nd Assist',
  'D-Blocks',
  'Catches',
  'Completions',
  'Throwaways',
  'ThrewDrop',
  'Drops',
  'Salary'
]

export default class ComparePlayers extends Component {
  props: Props

  state: {
    week: number,
    stats: any
  }

  constructor (props: Props) {
    super(props)

    let players = _.keys(this.props.stats)

    this.state = {
      week: this.props.week,
      stats: this.props.stats,
      playerAName: players[0],
      playerBName: players[1]
    }
  }

  componentDidMount () {
    this.renderD3()
  }

  componentDidUpdate () {
    this.updateD3()
  }

  renderD3 () {
    this.graph = new PlayerGraph()
    this.graph.init(this.node)

    let { playerAName, playerBName } = this.state
    let playerAStats = _.pick(this.state.stats[playerAName], STATS)
    let playerBStats = _.pick(this.state.stats[playerBName], STATS)

    this.graph.create(playerAStats, playerBStats, STATS)
  }

  updateD3 () {
    let { playerAName, playerBName } = this.state
    let playerAStats = _.pick(this.state.stats[playerAName], STATS)
    let playerBStats = _.pick(this.state.stats[playerBName], STATS)

    this.graph.update(playerAStats, playerBStats, STATS)
  }

  playerAChanged (value) {
    this.setState({playerAName: value})
  }

  playerBChanged (value) {
    this.setState({playerBName: value})
  }

  render () {
    let playerNames = _.keys(this.state.stats)
    let { playerAName, playerBName } = this.state

    return (
      <div>
        <div id="chart" ref={(node) => { this.node = node }}></div>
        <div className="row">
          <div className="col m2 s4">
            <PlayerSelect
              value={playerAName}
              players={playerNames}
              onChange={(event) => this.playerAChanged(event)}
            />
          </div>

          <div className="col m2 s4 right">
            <PlayerSelect
              value={playerBName}
              players={playerNames}
              onChange={(event) => this.playerBChanged(event)}
            />
          </div>
        </div>
      </div>
    )
  }
}
