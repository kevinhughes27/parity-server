import _ from 'lodash'
import React, { Component } from 'react'
import Trades from './Trades'
import SalaryBarGraph from './SalaryBarGraph'

type Props = {
  week: number,
  stats: any
}

export default class TradeSimulator extends Component {
  props: Props

  state: {
    week: number,
    stats: any,
    teams: Array<string>,
    team: string
  }

  constructor (props: Props) {
    super(props)

    let teams = _.uniq(_.map(_.values(this.props.stats), 'Team'))
    _.pull(teams, 'Substitute')

    this.state = {
      week: this.props.week,
      stats: this.props.stats,
      teams: teams,
      team: teams[0]
    }

    this.averageTeamSalary = _.sum(_.map(teams, (t) => {
      return _.sum(_.map(this.playersForTeam(t), (p) => p.salary))
    })) / teams.length

    this.salaryCap = _.floor(this.averageTeamSalary * 1.01)
    this.salaryFloor = _.floor(this.averageTeamSalary * 0.99)
  }

  componentDidMount () {
    this.renderD3()
  }

  componentDidUpdate () {
    this.updateD3()
  }

  renderD3 () {
    this.barChart = new SalaryBarGraph()
    this.barChart.init(this.barChartNode)
    let { teams, stats } = this.state
    this.barChart.create(teams, stats, this.salaryCap, this.salaryFloor)
  }

  updateD3 () {
    this.pieChart.barChart()
  }

  playersForCurrentTeam () {
    return this.playersForTeam(this.state.team)
  }

  playersForTeam (team) {
    let stats = this.state.stats

    let players = []
    _.mapKeys(stats, (playerStats, playerName) => {
      if (playerStats['Team'] === team) {
        players.push({name: playerName, salary: playerStats['Salary']})
      }
    })

    players = _.sortBy(players, (p) => p.salary)

    return players
  }

  render () {
    return (
      <div>
        <div className="row" style={{paddingTop: 20}}>
          <Trades applyTrade={ (trade) => this.applyTrade(trade) }/>
        </div>

        <div className="row" style={{paddingTop: 20}}>
          <div id="chart" ref={(node) => { this.barChartNode = node }}></div>
        </div>
      </div>
    )
  }

  applyTrade (trade) {

  }
}
