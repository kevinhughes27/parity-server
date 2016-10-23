// @flow

import $ from 'jquery'
import _ from 'lodash'
import React, { Component } from 'react'
import Griddle from 'griddle-react'
import MoneyCell from './MoneyCell'
import Loading from './Loading'

const STATS = [
  'Goals',
  'Assists',
  '2nd Assist',
  'D-Blocks',
  'Catches',
  'Completions',
  'Throwaways',
  'Drops',
  'Salary'
]

const zeroStats = _.zipObject(STATS)

const columns = [
  'Name',
  'Team',
  ...STATS
]

let columnsMeta = _.map(columns, (col, idx) => {
  return {
    columnName: col,
    order: idx + 1
  }
})

columnsMeta[STATS.length + 1] = {
  columnName: 'Salary',
  order: STATS.length + 1,
  customComponent: MoneyCell
}

type Props = {
  week: number
}

export default class Stats extends Component {
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

  _padStats (stats: Array<any>) {
    return _.assign({}, zeroStats, stats)
  }

  render () {
    if (this.state.loading) return (<Loading />)

    let stats = this.state.stats
    let statsArray = _.map(_.keys(stats), (k) => {
      return { Name: k, ...this._padStats(stats[k]) }
    })

    return (
      <Griddle
        results={statsArray}
        resultsPerPage={statsArray.length}
        tableClassName='highlight responsive-table'
        columns={columns}
        columnMetadata={columnsMeta}
        showFilter={true}
        showPager={false}
        useGriddleStyles={false}
        filterPlaceholderText='Search players or team ...'
      />
    )
  }
}
