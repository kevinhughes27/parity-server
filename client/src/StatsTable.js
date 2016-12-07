// @flow

import _ from 'lodash'
import React, { Component } from 'react'
import Griddle from 'griddle-react'
import Stats from './Stats'
import MoneyCell from './MoneyCell'

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
  week: number,
  stats: Stats
}

export default class StatsTable extends Component {
  props: Props

  state: {
    week: number,
    stats: Stats
  }

  constructor (props: Props) {
    super(props)

    this.state = {
      week: this.props.week,
      stats: this.props.stats
    }
  }

  render () {
    // filter players who only have a salary for this week.
    let statsArray = _.filter(this.state.stats.toArray(), (player) => {
      return _.keys(player).length > 4
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
