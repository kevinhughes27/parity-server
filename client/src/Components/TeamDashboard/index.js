// @flow

import _ from 'lodash'
import ls from 'local-storage'
import React, { Component } from 'react'
import MoneyCell from '../MoneyCell'
import TopNav from '../TopNav'
import Loading from '../Loading'
import { Pie } from 'react-chartjs-2'
import { colors, warnColors } from '../gradients'

export default class TeamDashboard extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loading: true,
      players: [],
      teams: [],
      team: null
    }
  }

  componentWillMount() {
    fetch('/api/players')
      .then(response => response.json())
      .then(players => {
        const teams = _.uniq(players.map(p => p.team));
        this.setState({
          loading: false,
          players: players,
          teams: teams,
          team: ls.get('team') || teams[0]
        })
        window.$('.dropdown-button').dropdown()
      })
  }

  teamChanged (teamName) {
    ls.set('team', teamName)
    this.setState({team: teamName})
  }

  renderTeams () {
    const teams = this.state.teams

    return teams.map(team => {
      return (
        <li key={team}>
         <a onClick={() => { this.teamChanged(team) }}>
            {team}
          </a>
        </li>
      )
    })
  }

  renderTeamsDropdown () {
    const team = this.state.team

    return (
      <div>
        <a className='dropdown-button btn'
           style={{minWidth: '100%'}}
           data-activates='team-dropdown'>
          {team}
        </a>

        <ul id='team-dropdown' className='dropdown-content'>
          {this.renderTeams()}
        </ul>
      </div>
    )
  }

  renderPlayers () {
    const players = _.sortBy(this.state.players.filter(p => p.team === this.state.team), (p) => p.salary).reverse()
    const teamSalary = _.sum(_.map(players, (p) => p.salary))
    const salaryCap = _.sum(_.map(this.state.players, (p) => p.salary)) / 8 * 1.01
    const salaryFloor = _.sum(_.map(this.state.players, (p) => p.salary)) / 8 * 0.99

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
    const players = _.sortBy(this.state.players.filter(p => p.team === this.state.team), (p) => p.salary).reverse()
    const teamSalary = _.sum(_.map(players, (p) => p.salary))
    const salaryCap = _.sum(_.map(this.state.players, (p) => p.salary)) / 8 * 1.01

    const overCap = teamSalary > salaryCap

    const data = {
      labels: players.map (p => p.name),
      datasets: [{
        data: players.map (p => p.salary),
        backgroundColor: overCap ? warnColors : colors
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
    const loading = this.state.loading

    if (loading) return (<Loading />)

    return (
      <div>
        <TopNav />
        <div className='container'>
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
      </div>
    )
  }
}
