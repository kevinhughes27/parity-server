import React, { Component } from 'react'
import MaterialTable from 'material-table'
import { map, keys } from 'lodash'
import ls from 'local-storage'

const storageKey = 'searchBar'

const columnsMeta = [
  {
    field: 'name',
    title: 'Name',
    searchable: true
  },
  {
    field: 'team',
    title: 'Team',
    searchable: true
  },
  {
    field: 'goals',
    title: 'Goals',
    searchable: false
  },
  {
    field: 'assists',
    title: 'Assists',
    searchable: false
  },
  {
    field: 'second_assists',
    title: 'Second Assists',
    searchable: false
  },
  {
    field: 'd_blocks',
    title: 'D Blocks',
    searchable: false
  },
  {
    field: 'catches',
    title: 'Catches',
    searchable: false
  },
  {
    field: 'completions',
    title: 'Completions',
    searchable: false
  },
  {
    field: 'throw_aways',
    title: 'Throw Aways',
    searchable: false
  },
  {
    field: 'threw_drops',
    title: 'Threw Drops',
    searchable: false
  },
  {
    field: 'drops',
    title: 'Drops',
    searchable: false
  },
  {
    field: 'o_efficiency',
    title: 'Holds',
    searchable: false,
    render: rowData => rowData.o_points_for + '/' + (rowData.o_points_against + rowData.o_points_for)
  },
  {
    field: 'd_efficiency',
    title: 'Breaks',
    searchable: false,
    render: rowData => rowData.d_points_for + '/' + (rowData.d_points_against + rowData.d_points_for)
  },
  {
    field: 'pay',
    title: 'Pay',
    type: 'currency',
    defaultSort: 'desc',
    searchable: false
  }
]

function StatsTable(props) {
  const stats = props.stats
  const statsArray = map(keys(stats), (k) => {
    return { name: k, ...stats[k] }
  });

  return (
    <div className="responsive-table">
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
          searchText: ls.get(storageKey) || '',
          searchFieldAlignment: 'left',
          searchFieldStyle: {
            width: '95vw',
          },
          sorting: true,
          paging: false
        }}
        onSearchChange={(query) => {
          ls.set(storageKey, query)
        }}
      />
    </div>
  )
}

export default StatsTable;
