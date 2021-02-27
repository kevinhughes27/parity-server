import React from 'react'
import MaterialTable from 'material-table'
import { map, keys } from 'lodash'
import * as ls from 'local-storage'
import { Stats, StatLine } from '../api'

const storageKey = 'searchBar'

const columnsMeta = [
  {
    field: 'name' as const,
    title: 'Name' as const,
    searchable: true
  },
  {
    field: 'team' as const,
    title: 'Team' as const,
    searchable: true
  },
  {
    field: 'goals' as const,
    title: 'Goals' as const,
    searchable: false
  },
  {
    field: 'assists' as const,
    title: 'Assists' as const,
    searchable: false
  },
  {
    field: 'second_assists' as const,
    title: 'Second Assists' as const,
    searchable: false
  },
  {
    field: 'd_blocks' as const,
    title: 'D Blocks' as const,
    searchable: false
  },
  {
    field: 'catches' as const,
    title: 'Catches' as const,
    searchable: false
  },
  {
    field: 'completions' as const,
    title: 'Completions' as const,
    searchable: false
  },
  {
    field: 'throw_aways' as const,
    title: 'Throw Aways' as const,
    searchable: false
  },
  {
    field: 'threw_drops' as const,
    title: 'Threw Drops' as const,
    searchable: false
  },
  {
    field: 'drops' as const,
    title: 'Drops' as const,
    searchable: false
  },
  {
    field: 'o_efficiency' as const,
    title: 'Holds as const',
    searchable: false,
    render: (rowData: StatLine) => rowData.o_points_for + '/' + (rowData.o_points_against + rowData.o_points_for)
  },
  {
    field: 'd_efficiency' as const,
    title: 'Breaks' as const,
    searchable: false,
    render: (rowData: StatLine) => rowData.d_points_for + '/' + (rowData.d_points_against + rowData.d_points_for)
  },
  {
    field: 'pay' as const,
    title: 'Pay' as const,
    type: 'currency' as const,
    defaultSort: 'desc' as const,
    searchable: false
  }
]

function StatsTable(props: {stats: Stats}) {
  const stats = props.stats
  const statsArray = map(keys(stats), (k) => {
    return {...stats[k], name: k}
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
          searchText: ls.get<string>(storageKey) || '',
          searchFieldAlignment: 'left',
          searchFieldStyle: {
            width: '95vw',
          },
          sorting: true,
          paging: false
        }}
        onSearchChange={(query) => {
          ls.set<string>(storageKey, query)
        }}
      />
    </div>
  )
}

export default StatsTable;
