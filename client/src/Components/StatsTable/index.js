// @flow

import _ from 'lodash'
import React, { Component } from 'react'
import Griddle from 'griddle-react'
import Stats from '../../Stores/Stats'
import MoneyCell from '../MoneyCell'
import SearchBar from './SearchBar'
import capitalize from 'capitalize'

const STATS = [
  'goals',
  'assists',
  'second_assists',
  'd_blocks',
  'catches',
  'completions',
  'throw_aways',
  'threw_drops',
  'drops'
]

const columns = [
  'name',
  'team',
  ...STATS
]

const columnsMeta = _.map(columns, (col, idx) => {
  return {
    columnName: col,
    displayName: capitalize(col.replace('_', ' ')),
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

    this.columns.push('pay')
    this.columnsMeta.push({
      columnName: 'pay',
      displayName: 'Pay',
      order: STATS.length + 2,
      customComponent: MoneyCell
    })

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
