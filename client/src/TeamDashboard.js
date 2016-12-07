import _ from 'lodash'
import React, { Component } from 'react'
import Stats from './Stats'
import MoneyCell from './MoneyCell'
import TeamGraph from './TeamGraph'

type Props = {
  week: number,
  stats: Stats
}

export default class TeamDashboard extends Component {
  props: Props

  state: {
    week: number,
    stats: Stats,
    team: string
  }

  constructor (props: Props) {
    super(props)

    this.state = {
      week: this.props.week,
      stats: this.props.stats,
      team: this.props.stats.teamNames()[0]
    }
  }

  playersForCurrentTeam () {
    let { team, stats } = this.state
    return stats.playersFor(team).reverse()
  }

  componentDidMount () {
    window.$('.dropdown-button').dropdown()
    this.renderD3()
  }

  componentDidUpdate () {
    this.updateD3()
  }

  renderD3 () {
    let players = this.playersForCurrentTeam()

    this.pieChart = new TeamGraph()
    this.pieChart.init(this.pieChartNode)
    this.pieChart.create(players)
  }

  updateD3 () {
    let players = this.playersForCurrentTeam()
    this.pieChart.update(players)
  }

  renderTeams (teams: Array<any>) {
    return _.map(teams, (team) => {
      return (
        <li key={team}>
         <a onClick={() => { this.setState({team}) } }>
            {team}
          </a>
        </li>
      )
    })
  }

  renderTeamsDropdown () {
    let { team, stats } = this.state
    let teams = stats.teamNames()

    return (
      <div>
        <a className='dropdown-button btn'
           style={{minWidth: '100%'}}
           data-activates='team-dropdown'>
          {team}
        </a>

        <ul id='team-dropdown' className='dropdown-content'>
          {this.renderTeams(teams)}
        </ul>
      </div>
    )
  }

  renderPlayers () {
    let { team, stats } = this.state
    let players = this.playersForCurrentTeam()
    let teamSalary = stats.teamSalary(team)
    let salaryCap = stats.salaryCap()

    return (
      <table className='highlight'>
      <thead>
        <tr>
          <th>Player</th>
          <th>Salary</th>
        </tr>
      </thead>
        <tbody>
          { _.map(players, (player) => {
            return (
              <tr key={player.name} style={{lineHeight: 0.5}}>
                <td>{player.name}</td>
                <td><MoneyCell data={player.salary}/></td>
              </tr>
            )
          })}
          <tr style={{borderTop: '1px solid grey', lineHeight: 0.5}}>
            <td>Current Salary</td>
            <td><MoneyCell data={teamSalary}/></td>
          </tr>
          <tr style={{lineHeight: 0.5}}>
            <td>League Salary Cap</td>
            <td><MoneyCell data={salaryCap}/></td>
          </tr>
          <tr style={{lineHeight: 0.5}}>
            <td><b>Team Cap Space</b></td>
            <td><MoneyCell data={salaryCap - teamSalary}/></td>
          </tr>
        </tbody>
      </table>
    )
  }

  render () {
    return (
      <div>
        <div className="row" style={{paddingTop: 20}}>
          <div className="col m6">
            {this.renderTeamsDropdown()}
            {this.renderPlayers()}
          </div>
          <div className="col m6">
            <div id="pie-chart" ref={(node) => { this.pieChartNode = node }}></div>
          </div>
        </div>
      </div>
    )
  }
}
