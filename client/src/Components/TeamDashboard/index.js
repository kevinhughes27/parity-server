// @flow

import _ from 'lodash'
import React, { Component } from 'react'
import Stats from '../../Stores/Stats'
import MoneyCell from '../MoneyCell'
import { Pie } from 'react-chartjs-2'

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
    let salaryFloor = stats.salaryFloor()

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
            <td>League Salary Floor</td>
            <td><MoneyCell data={salaryFloor}/></td>
          </tr>
            <tr style={{lineHeight: 0.5}}>
            <td>Team Floor Clearance</td>
            <td><MoneyCell data={teamSalary - salaryFloor}/></td>
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

  renderGraph () {
    const players = this.playersForCurrentTeam()

    const data = {
      labels: players.map (p => p.name),
      datasets: [{
        data: players.map (p => p.salary),
        backgroundColor: [
          '#E5F5E0',
          '#D7EDD4',
          '#C9E5C9',
          '#BBDEBE',
          '#ADD6B3',
          '#9FCFA8',
          '#91C79D',
          '#84C092',
          '#76B887',
          '#68B07C',
          '#5AA971',
          '#4CA166',
          '#3E9A5B',
          '#309250',
          '#238B45'
        ]
      }]
    };

    const options = {
      legend: {
        display: false
      }
    }

    return <Pie data={data} height={400} options={options}/>
  }

  render () {
    const players = this.playersForCurrentTeam()

    return (
      <div>
        <div className="row" style={{paddingTop: 20}}>
          <div className="col m6">
            {this.renderTeamsDropdown()}
            {this.renderPlayers()}
          </div>
          <div className="col m6">
            { this.renderGraph() }
          </div>
        </div>
      </div>
    )
  }
}
