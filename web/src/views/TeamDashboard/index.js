import React, { Component } from 'react'
import Container from '@material-ui/core/Container'
import TeamPicker from './TeamPicker'
import TeamTable from './TeamTable'
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'
import PieChart from './PieChart'
import BarChart from './BarChart'
import LeagueChart from './LeagueChart'
import Trades from './Trades'
import TradeModal from './TradeModal'
import { calcSalaryLimits } from '../../helpers'
import { map, sum, sortBy, findIndex, uniq, remove, isEqual, difference, includes, find } from 'lodash'
import ls from 'local-storage'

const storageKey = 'currentTeam'
const defaultPlayer = {name: ''}

export default class TeamDashboard extends Component {
  constructor (props) {
    super(props)

    const players = this.props.players
    const teamNames = sortBy(uniq(players.map(p => p.team)));
    const defaultTeam = teamNames[0]

    let currentTeam = ls.get(storageKey)
    const validTeam = includes(teamNames, currentTeam)

    if (!validTeam) {
      currentTeam = defaultTeam
    }

    this.state = {
      players: players,
      team: currentTeam,
      trading: false,
      playerA: defaultPlayer,
      playerB: defaultPlayer,
      trades: [],
      tab: 0
    }

    this.teamChanged = this.teamChanged.bind(this)
    this.tabChanged = this.tabChanged.bind(this)
    this.applyTrade = this.applyTrade.bind(this)
  }

  teamChanged (event) {
    const teamName = event.target.value
    ls.set(storageKey, teamName)
    this.setState({team: teamName})
  }

  tabChanged (_event, tab) {
    this.setState({tab})
  }

  openTradeModal = (player) => {
    this.setState({trading: true, playerA: player, playerB: defaultPlayer})
  }

  closeTradeModal = () => {
    this.setState({trading: false, playerA: defaultPlayer, playerB: defaultPlayer})
  }

  updateTrade = (_event, player) => {
    const allPlayers = this.state.players
    const playerB = find(allPlayers, (p) => p.name === player.name) || defaultPlayer
    this.setState({playerB})
  }

  applyTrade = () => {
    const { players, playerA, playerB, trades } = this.state

    const playerAIdx = findIndex(players, (p) => p.name === playerA.name)
    const playerBIdx = findIndex(players, (p) => p.name === playerB.name)

    const teamA = players[playerAIdx]['team']
    const teamB = players[playerBIdx]['team']

    players[playerAIdx]['team'] = teamB
    players[playerBIdx]['team'] = teamA

    trades.push({playerA, playerB})

    this.setState({players: players, trades: trades, trading: false})
  }

  removeTrade = (trade) => {
    const { players, trades } = this.state

    const playerA = trade.playerA
    const playerB = trade.playerB

    const playerAIdx = findIndex(players, (p) => p.name === playerA.name)
    const playerBIdx = findIndex(players, (p) => p.name === playerB.name)

    const teamA = players[playerAIdx]['team']
    const teamB = players[playerBIdx]['team']

    players[playerAIdx]['team'] = teamB
    players[playerBIdx]['team'] = teamA

    remove(trades, (t) => isEqual(t, trade))

    this.setState({players: players, trades: trades})
  }

  render () {
    const {tab, team, trades, trading, playerA, playerB, players: allPlayers } = this.state;
    const teamPlayers = allPlayers.filter(p => p.team === team);
    const otherPlayers = difference(allPlayers, teamPlayers)

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
      maxWidth: 640
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
            <TeamTable
              teamPlayers={sortedPlayers}
              teamSalary={teamSalary}
              salaryCap={salaryCap}
              salaryFloor={salaryFloor}
              openTradeModal={this.openTradeModal}
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
              <Tab label="Trades" />
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
            { tab === 3 &&
              <Trades
                trades={trades}
                removeTrade={this.removeTrade}
              />
            }
          </div>
        </div>
        <TradeModal
          open={trading}
          trades={trades}
          players={otherPlayers}
          playerA={playerA}
          playerB={playerB}
          overCap={overCap}
          updateTrade={this.updateTrade}
          submitTrade={this.applyTrade}
          removeTrade={this.removeTrade}
          onClose={this.closeTradeModal}
        />
      </Container>
    )
  }
}
