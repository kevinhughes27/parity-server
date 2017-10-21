// @flow

import _ from 'lodash'
import React, { Component } from 'react'
import Griddle from 'griddle-react'
import Stats from '../../Stores/Stats'
import MoneyCell from '../MoneyCell'
import SearchBar from './SearchBar'

const STATS = [
  'Goals',
  'Assists',
  '2nd Assist',
  'D-Blocks',
  'Catches',
  'Completions',
  'Throwaways',
  'ThrewDrop',
  'Drops'
]

const columns = [
  'Name',
  'Team',
  ...STATS
]

const columnsMeta = _.map(columns, (col, idx) => {
  return {
    columnName: col,
    order: idx + 1
  }
})

type Props = {
  week: number,
  stats: Stats
}

export default class StatsTable extends Component {
  props: Props
  columns: Array<string>
  columnsMeta: Array<any>

  state: {
    week: number,
    stats: Stats
  }

  constructor (props: Props) {
    super(props)

    this.columns = columns.slice()
    this.columnsMeta = columnsMeta.slice()

    if (this.props.week === 0) {
      this.columns.push('Salary')
      this.columnsMeta.push({
        columnName: 'Salary',
        order: STATS.length + 2,
        customComponent: MoneyCell
      })
    } else {
      this.columns.push('SalaryDelta')
      this.columnsMeta.push({
        columnName: 'SalaryDelta',
        order: STATS.length + 2,
        customComponent: MoneyCell
      })
    }

    this.state = {
      week: this.props.week,
      stats: this.props.stats
    }
  }

  render () {
    let statsArray = this.state.stats.playersWithStats()

    return (
      <Griddle
        results={statsArray}
        resultsPerPage={statsArray.length}
        tableClassName='highlight responsive-table'
        columns={this.columns}
        columnMetadata={this.columnsMeta}
        showFilter={true}
        showPager={false}
        useGriddleStyles={false}
        useCustomFilterComponent={true}
        customFilterComponent={SearchBar}
      />
    )
  }
}
