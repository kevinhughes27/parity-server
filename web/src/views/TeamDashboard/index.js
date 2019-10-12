import _ from 'lodash'
import ls from 'local-storage'
import React, { Component } from 'react'
import Container from '@material-ui/core/Container'
import TeamPicker from './TeamPicker'
import Table from './Table'
import Chart from './Chart'
import { calcSalaryLimits } from '../../helpers'

export default class TeamDashboard extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loading: true,
      players: this.props.players,
      team: ls.get('team') || this.props.players[0].team
    }

    this.teamChanged = this.teamChanged.bind(this)
  }

  teamChanged (event) {
    const teamName = event.target.value
    ls.set('team', teamName)
    this.setState({team: teamName})
  }

  render () {
    const {team, players: allPlayers } = this.state;
    const teamPlayers = allPlayers.filter(p => p.team === team);
    const sortedPlayers = _.sortBy(teamPlayers, (p) => p.salary).reverse();
    const salaries = _.map(sortedPlayers, (p) => p.salary);
    const teamSalary = _.sum(salaries);
    const { salaryCap, salaryFloor } = calcSalaryLimits(allPlayers);
    const overCap = teamSalary > salaryCap;
    const underFloor = teamSalary < salaryFloor;

    return (
      <Container fixed>
        <div style={{display: 'flex', paddingTop: 20, height: '100%'}}>
          <div style={{flexGrow: 1}}>
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
          <div style={{flexGrow: 1}}>
            <Chart
              players={sortedPlayers}
              overCap={overCap}
              underFloor={underFloor}
            />
          </div>
        </div>
      </Container>
    )
  }
}
