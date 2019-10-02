import _ from 'lodash'
import React, { Component } from 'react'
// import Griddle from 'griddle-react'
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

columns.push('pay')
columnsMeta.push({
  columnName: 'pay',
  displayName: 'Pay',
  order: STATS.length + 2,
  customComponent: MoneyCell
})

export default class StatsTable extends Component {
  render () {
    const stats = this.props.stats
    const statsArray = _.map(_.keys(stats), (k) => {
      return { name: k, ...stats[k] }
    })

    return <div>Stats</div>

    // return (
    //   <Griddle
    //     results={statsArray}
    //     resultsPerPage={statsArray.length}
    //     tableClassName='highlight responsive-table'
    //     columns={columns}
    //     columnMetadata={columnsMeta}
    //     showFilter={true}
    //     showPager={false}
    //     useGriddleStyles={false}
    //     useCustomFilterComponent={true}
    //     customFilterComponent={SearchBar}
    //   />
    // )
  }
}
