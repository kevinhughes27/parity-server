// @flow

import _ from 'lodash'
import React, { Component } from 'react'
import Stats from '../../Stores/Stats'
import PlayerSelect from '../PlayerSelect'
import PlayerGraph from './PlayerGraph'
import './compare-players.css'

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

type Props = {
  week: number,
  stats: Stats
}

export default class ComparePlayers extends Component {
  props: Props
  graph: PlayerGraph
  node: Node
  state: {
    week: number,
    stats: Stats,
    playerAName: string,
    playerBName: string,
  }

  constructor (props: Props) {
    super(props)

    let players = this.props.stats.playerNames()

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

    let { playerAName, playerBName, stats } = this.state
    let playerAStats = _.pick(stats.forPlayer(playerAName), STATS)
    let playerBStats = _.pick(stats.forPlayer(playerBName), STATS)

    this.graph.create(playerAStats, playerBStats, STATS)
  }

  updateD3 () {
    let { playerAName, playerBName, stats } = this.state
    let playerAStats = _.pick(stats.forPlayer(playerAName), STATS)
    let playerBStats = _.pick(stats.forPlayer(playerBName), STATS)

    this.graph.update(playerAStats, playerBStats, STATS)
  }

  playerAChanged (value: string) {
    this.setState({playerAName: value})
  }

  playerBChanged (value: string) {
    this.setState({playerBName: value})
  }

  render () {
    let playerNames = this.state.stats.playerNames()
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
