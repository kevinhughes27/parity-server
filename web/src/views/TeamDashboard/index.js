import React, { Component } from 'react'
import Container from '@material-ui/core/Container'
import TeamPicker from './TeamPicker'
import Table from './Table'
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'
import PieChart from './PieChart'
import BarChart from './BarChart'
import LeagueChart from './LeagueChart'
import { calcSalaryLimits } from '../../helpers'
import { map, sum, sortBy, uniq } from 'lodash'

export default class TeamDashboard extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loading: true,
      players: this.props.players,
      team: this.props.players[0].team,
      tab: 0
    }

    this.teamChanged = this.teamChanged.bind(this)
    this.tabChanged = this.tabChanged.bind(this)
  }

  teamChanged (event) {
    const teamName = event.target.value
    this.setState({team: teamName})
  }

  tabChanged (_event, tab) {
    this.setState({tab})
  }

  render () {
    const {tab, team, players: allPlayers } = this.state;
    const teamPlayers = allPlayers.filter(p => p.team === team);
    const teamNames = sortBy(uniq(allPlayers.map(p => p.team)));
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
      paddingTop: 20
    }

    const chartStyle = {
      flexGrow: 1,
      maxWidth: 500
    }

    return (
      <Container fixed>
        <div style={layoutStyle}>
          <div style={{minWidth: 240, paddingBottom: 20}}>
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
            <Tabs
              value={tab}
              onChange={this.tabChanged}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab label="Bar Chart" />
              <Tab label="Pie Chart" />
              <Tab label="League Chart" />
            </Tabs>
            { tab === 0 &&
              <BarChart
                players={sortedPlayers}
                overCap={overCap}
                underFloor={underFloor}
              />
            }
            { tab === 1 &&
              <PieChart
                players={sortedPlayers}
                overCap={overCap}
                underFloor={underFloor}
              />
            }
            { tab === 2 &&
              <LeagueChart
                players={allPlayers}
                teamNames={teamNames}
                salaryCap={salaryCap}
                salaryFloor={salaryFloor}
              />
            }
          </div>
        </div>
      </Container>
    )
  }
}
