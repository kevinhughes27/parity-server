import _ from 'lodash'
import ls from 'local-storage'
import React, { Component } from 'react'
import TopNav from '../TopNav'
import Loading from '../Loading'
import TeamPicker from './TeamPicker'
import Table from './Table'
import Chart from './Chart'
import { calcSalaryCap, calcSalaryFloor } from '../helpers'

export default class TeamDashboard extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loading: true,
      players: [],
      team: null
    }

    this.teamChanged = this.teamChanged.bind(this)
  }

  componentWillMount() {
    fetch('/api/players')
      .then(response => response.json())
      .then(players => {

        this.setState({
          loading: false,
          players: players,
          team: ls.get('team') || players[0].team
        })
      })
  }

  teamChanged (teamName) {
    ls.set('team', teamName)
    this.setState({team: teamName})
  }

  renderMain () {
    const loading = this.state.loading

    if (loading) return (<Loading />)

    const {team, players: allPlayers } = this.state;
    const teamPlayers = allPlayers.filter(p => p.team === team);
    const sortedPlayers = _.sortBy(teamPlayers, (p) => p.salary).reverse();
    const salaries = _.map(sortedPlayers, (p) => p.salary);
    const teamSalary = _.sum(salaries);
    const salaryCap = calcSalaryCap(allPlayers);
    const salaryFloor = calcSalaryFloor(allPlayers);
    const overCap = teamSalary > salaryCap;

    return (
      <div className='container'>
        <div className="row" style={{paddingTop: 20}}>
          <div className="col m6">
            <TeamPicker
              allPlayers={allPlayers}
              team={team}
              onChange={this.teamChanged}
            />
            <Table
              players={sortedPlayers}
              teamSalary={teamSalary}
              salaryCap={salaryCap}
              salaryFloor={salaryFloor}
            />
          </div>
          <div className="col m6">
            <Chart
              players={sortedPlayers}
              overCap={overCap}
            />
          </div>
        </div>
      </div>
    )
  }

  render () {
    return (
      <div>
        <TopNav />
        { this.renderMain() }
      </div>
    )
  }
}
