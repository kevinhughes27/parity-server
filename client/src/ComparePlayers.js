let $ = window.$ // can remove this too
import React, { Component } from 'react'
import PlayerGraph from './PlayerGraph'

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
    let node = $('#chart')
    let graph = new PlayerGraph(node)
    let playerA = this.state.stats[this.state.playerAName]
    let playerB = this.state.stats[this.state.playerBName]
    graph.graphPlayers(playerA, playerB)
  }

  render () {
    return (
      <div>
        <svg id="chart"></svg>
      </div>
    )
  }
}
