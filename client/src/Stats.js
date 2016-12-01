// @flow

import _ from 'lodash'
import React, { Component } from 'react'
import Griddle from 'griddle-react'
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
  'SalaryDelta',
  'Salary'
]

const columns = [
  'Name',
  'Team',
  ...STATS
]

columnsMeta = {
  'Name',
  'Team',
  'Goals',
  'Assists',
  '2nd Assist',
  'D-Blocks',
  'Catches',
  'Completions',
  'Throwaways',
  'Threw Drop',
  'Drops',
  'Weekly Salary Increase',
  'New Salary'
}
  
columnsMeta[STATS.length + 1] = {
  columnName: 'New Salary',
  order: STATS.length + 1,
  customComponent: MoneyCell
}

type Props = {
  week: number,
  stats: any
}

export default class Stats extends Component {
  props: Props

  state: {
    week: number,
    stats: any
  }

  constructor (props: Props) {
    super(props)

    this.state = {
      week: this.props.week,
      stats: this.props.stats
    }
  }

  render () {
    let stats = this.state.stats
    let statsArray = _.map(_.keys(stats), (k) => {
      return { Name: k, ...stats[k] }
    })

    // filter players who only have a salary for this week.
    statsArray = _.filter(statsArray, (player) => {
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
