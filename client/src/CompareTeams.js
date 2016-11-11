let $ = window.$
import React, { Component } from 'react'

type Props = {
  week: number
}

export default class CompareTeams extends Component {
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
      stats: null
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

  render () {
    return (
      <div>
        Compare Teams {this.props.week}
      </div>
    )
  }
}
