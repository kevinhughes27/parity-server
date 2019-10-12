import _ from 'lodash'
import React, { Component } from 'react'
import MaterialTable from 'material-table'
import MoneyCell from './MoneyCell'
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
    field: col,
    title: capitalize(col.replace('_', ' ')),
  }
})

columnsMeta.push({
  field: 'pay',
  title: 'Pay',
  render: rowData =>  <MoneyCell data={rowData.pay} />
})

export default class StatsTable extends Component {
  render () {
    const stats = this.props.stats
    const statsArray = _.map(_.keys(stats), (k) => {
      return { name: k, ...stats[k] }
    })

    return (
      <MaterialTable
        columns={columnsMeta}
        data={statsArray}
        style={{
          maxWidth: '98vw',
          margin: 'auto',
          marginTop: 20
        }}
        options={{
          showTitle: false,
          search: true,
          searchFieldAlignment: 'left',
          searchFieldStyle: {
            width: '95vw',
          },
          sorting: true,
          paging: false
        }}
      />
    )
  }
}
