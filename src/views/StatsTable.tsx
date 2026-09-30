import React from 'react';
import MUIDataTable, { MUIDataTableOptions, MUIDataTableProps } from 'mui-datatables';
import { map, keys } from 'lodash';
import * as ls from 'local-storage';
import { Stats } from '../api';

const storageKey = 'searchBar';

const columnsMeta = [
  {
    name: 'name' as const,
    label: 'Name' as const,
    options: {
      filter: false,
      searchable: true,
    },
  },
  {
    name: 'team' as const,
    label: 'Team' as const,
    options: {
      searchable: true,
      filter: true,
      customFilterListOptions: {
        render: (v: string) => {
          return `Team: ${v}`;
        },
      },
      customBodyRender: (value: string) => <div style={{ fontSize: 10 }}>{value}</div>,
    },
  },
  {
    name: 'goals' as const,
    label: 'Goals' as const,
    options: {
      sortDescFirst: true,
      searchable: false,
      filter: true,
      customFilterListOptions: {
        render: (v: number) => {
          return `Goals: ${v}`;
        },
      },
    },
  },
  {
    name: 'assists' as const,
    label: 'Assists' as const,
    options: {
      sortDescFirst: true,
      searchable: false,
      filter: true,
      customFilterListOptions: {
        render: (v: number) => {
          return `Assists: ${v}`;
        },
      },
    },
  },
  {
    name: 'second_assists' as const,
    label: 'Second Assists' as const,
    options: {
      sortDescFirst: true,
      searchable: false,
      filter: true,
      customFilterListOptions: {
        render: (v: number) => {
          return `Second Assists: ${v}`;
        },
      },
    },
  },
  {
    name: 'callahan' as const,
    label: 'Callahans' as const,
    options: {
      sortDescFirst: true,
      searchable: false,
      filter: true,
      display: false,
      customFilterListOptions: {
        render: (v: number) => {
          return `Callahans: ${v}`;
        },
      },
    },
  },
  {
    name: 'd_blocks' as const,
    label: 'D Blocks' as const,
    options: {
      sortDescFirst: true,
      searchable: false,
      filter: true,
      customFilterListOptions: {
        render: (v: number) => {
          return `D Blocks: ${v}`;
        },
      },
    },
  },
  {
    name: 'catches' as const,
    label: 'Catches' as const,
    options: {
      sortDescFirst: true,
      searchable: false,
      filter: true,
      customFilterListOptions: {
        render: (v: number) => {
          return `Catches: ${v}`;
        },
      },
    },
  },
  {
    name: 'completions' as const,
    label: 'Completions' as const,
    options: {
      sortDescFirst: true,
      searchable: false,
      filter: true,
      customFilterListOptions: {
        render: (v: number) => {
          return `Completions: ${v}`;
        },
      },
    },
  },
  {
    name: 'throw_aways' as const,
    label: 'Throw Aways' as const,
    options: {
      sortDescFirst: true,
      searchable: false,
      filter: true,
      customFilterListOptions: {
        render: (v: number) => {
          return `Throw Aways: ${v}`;
        },
      },
    },
  },
  {
    name: 'threw_drops' as const,
    label: 'Threw Drops' as const,
    options: {
      sortDescFirst: true,
      searchable: false,
      filter: true,
      customFilterListOptions: {
        render: (v: number) => {
          return `Threw Drops: ${v}`;
        },
      },
    },
  },
  {
    name: 'drops' as const,
    label: 'Drops' as const,
    options: {
      sortDescFirst: true,
      searchable: false,
      filter: true,
      customFilterListOptions: {
        render: (v: number) => {
          return `Drops: ${v}`;
        },
      },
    },
  },
  {
    name: 'holds' as const,
    label: 'Holds' as const,
    options: {
      sort: false,
      searchable: false,
      filter: false,
    },
  },
  {
    name: 'breaks' as const,
    label: 'Breaks' as const,
    options: {
      sort: false,
      searchable: false,
      filter: false,
    },
  },
  {
    name: 'pay' as const,
    label: 'Pay' as const,
    options: {
      sortDescFirst: true,
      searchable: false,
      filter: false,
      customBodyRender: (value: number) => {
        const nf = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });

        return nf.format(value);
      },
    },
  },
];

function StatsTable(props: { stats: Stats }) {
  const stats = props.stats;
  const statsArray = map(keys(stats), k => {
    return {
      ...stats[k],
      name: k,
      holds: stats[k].o_points_for + '/' + (stats[k].o_points_against + stats[k].o_points_for),
      breaks: stats[k].d_points_for + '/' + (stats[k].d_points_against + stats[k].d_points_for),
    };
  });

  const options: MUIDataTableOptions = {
    responsive: 'standard',
    search: true,
    searchOpen: true,
    onSearchChange: (searchText: string | null) => {
      ls.set<string>(storageKey, searchText || '');
    },
    searchText: ls.get<string>(storageKey) || '',
    sort: true,
    sortOrder: {
      name: 'pay',
      direction: 'desc',
    },
    selectableRows: 'none',
    pagination: false,
    download: false,
    print: false,
  };

  const tableProps: MUIDataTableProps = {
    title: null,
    columns: columnsMeta,
    data: statsArray,
    options,
  };

  const TableComponent = MUIDataTable as React.ComponentType<MUIDataTableProps>;

  return (
    <div className="responsive-table">
      <TableComponent {...tableProps} />
    </div>
  );
}

export default StatsTable;
