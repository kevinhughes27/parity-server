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

    this.state = {
      week: this.props.week,
      stats: this.props.stats,
      playerAName: 'Kevin Hughes',
      playerBName: 'Rob Ives'
    }
  }

  componentDidMount () {
    this.renderGraph()
  }

  renderGraph () {
    let graph = new PlayerGraph(this.node)

    let playerAName = this.state.playerAName
    let playerBName = this.state.playerBName

    let playerAStats = _.pick(this.state.stats[playerAName], STATS)
    let playerBStats = _.pick(this.state.stats[playerBName], STATS)

    graph.graphPlayers(playerAStats, playerBStats)
  }

  render () {
    let playerNames = _.keys(this.state.stats)

    return (
      <div>
        <svg id="chart" ref={(node) => { this.node = node }}></svg>
        <div className="row">
          <div className="input-field inline col s2">
            <PlayerSelect players={playerNames}/>
          </div>

          <div className="input-field col inline s2 right">
            <PlayerSelect players={playerNames}/>
          </div>
        </div>
      </div>
    )
  }
}
