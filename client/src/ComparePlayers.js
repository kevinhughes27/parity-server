let $ = window.$
import React, { Component } from 'react'
import Loading from './Loading'
import PlayerGraph from './PlayerGraph'

export default class ComparePlayers extends Component {
  props: Props

  state: {
    loading: boolean,
    week: number,
    stats: any
  }

  constructor (props: Props) {
    super(props)

    this.state = {
      loading: true,
      week: this.props.week,
      stats: null,
      playerAName: 'Kevin Hughes',
      playerBName: 'Rob Ives'
    }
  }

  componentWillMount () {
    this._fetchWeek(this.state.week)
  }

  componentWillReceiveProps (nextProps: Props) {
    let week = nextProps.week

    this.setState({
      loading: true,
      week: week,
      stats: null
    })

    this._fetchWeek(week)
  }

  _fetchWeek (num: number) {
    let url = `/weeks/${num}`
    if (num === 0) url = '/stats'

    $.get(url, (result) => {
      let stats = result ? result.stats : {}
      this.setState({ stats: stats, loading: false })
    })
  }

  componentDidUpdate () {
    if (this.state.loading) return
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
    if (this.state.loading) return (<Loading />)

    return (
      <div>
        <svg id="chart"></svg>
      </div>
    )
  }
}
