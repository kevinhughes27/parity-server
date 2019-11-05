import React, { Component } from 'react'
import Container from '@material-ui/core/Container'
import TeamPicker from './TeamPicker'
import Table from './Table'
import Chart from './Chart'
import { calcSalaryLimits } from '../../helpers'
import { map, sum, sortBy } from 'lodash'

export default class TeamDashboard extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loading: true,
      players: this.props.players,
      team: this.props.players[0].team
    }

    this.teamChanged = this.teamChanged.bind(this)
  }

  teamChanged (event) {
    const teamName = event.target.value
    this.setState({team: teamName})
  }

  render () {
    const {team, players: allPlayers } = this.state;
    const teamPlayers = allPlayers.filter(p => p.team === team);
    const sortedPlayers = sortBy(teamPlayers, (p) => p.salary).reverse();
    const salaries = map(sortedPlayers, (p) => p.salary);
    const teamSalary = sum(salaries);
    const { salaryCap, salaryFloor } = calcSalaryLimits(allPlayers);
    const overCap = teamSalary > salaryCap;
    const underFloor = teamSalary < salaryFloor;

    const layoutStyle = {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-around',
      paddingTop: 20,
      height: '100%'
    }

    const chartStyle = {
      flexGrow: 1,
      maxWidth: '50%',
      marginLeft: 50,
      marginRight: 50
    }

    return (
      <Container fixed>
        <div style={layoutStyle}>
          <div style={{minWidth: 240}}>
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
          <div style={chartStyle}>
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
