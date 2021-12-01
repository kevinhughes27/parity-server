import React, { useState } from 'react'
import Container from '@mui/material/Container'
import TeamPicker from './TeamPicker'
import TeamTable from './TeamTable'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import PieChart from './PieChart'
import BarChart from './BarChart'
import LeagueChart from './LeagueChart'
import Trades from './Trades'
import TradeModal from './TradeModal'
import { calcSalaryLimits } from '../../helpers'
import { map, max, sum, sortBy, findIndex, uniq, remove, isEqual, difference, includes, find } from 'lodash'
import * as ls from 'local-storage'
import { Player } from '../../api'

const storageKey = 'currentTeam'
const defaultPlayer = {name: '', team: '', salary: 0}

interface ITrade {
  playerA: Player;
  playerB: Player
}

interface TeamDashboardProps {
  players: Player[]
}

export default function TeamDashboard(props: TeamDashboardProps) {
  const teamNames = sortBy(uniq(props.players.map(p => p.team)));
  const defaultTeam = teamNames[0]

  let currentTeam = ls.get<string>(storageKey)
  const validTeam = includes(teamNames, currentTeam)
  if (!validTeam) {
    currentTeam = defaultTeam
  }

  const [allPlayers, updateAllPlayers] = useState(props.players)
  const [team, setTeam] = useState(currentTeam)
  const [modalOpen, setModalOpen] = useState(false)
  const [trades, setTrades] = useState<ITrade[]>([])
  const [playerA, setPlayerA] = useState<Player>(defaultPlayer)
  const [playerB, setPlayerB] = useState<Player>(defaultPlayer)
  const [tab, setTab] = useState(0)

  const forceUpdate = React.useReducer(bool => !bool, false)[1];

  const teamChanged = (teamName: string) => {
    ls.set<string>(storageKey, teamName)
    setTeam(teamName)
  }

  const tabChanged = (_event: React.ChangeEvent<{}>, tab: number) => {
    setTab(tab)
  }

  const openTradeModal = (player: Player) => {
    setModalOpen(true)
    setPlayerA(player)
    setPlayerB(defaultPlayer)
  }

  const closeTradeModal = () => {
    setModalOpen(false)
    setPlayerA(defaultPlayer)
    setPlayerB(defaultPlayer)
  }

  const updateTrade = (player: Player) => {
    const playerB = find(allPlayers, (p) => p.name === player.name) || defaultPlayer
    setPlayerB(playerB)
  }

  const applyTrade = () => {
    const playerAIdx = findIndex(allPlayers, (p) => p.name === playerA.name)
    const playerBIdx = findIndex(allPlayers, (p) => p.name === playerB.name)

    const teamA = allPlayers[playerAIdx]['team']
    const teamB = allPlayers[playerBIdx]['team']

    allPlayers[playerAIdx]['team'] = teamB
    allPlayers[playerBIdx]['team'] = teamA

    trades.push({playerA, playerB})

    updateAllPlayers(allPlayers)
    setTrades(trades)

    closeTradeModal()
  }

  const removeTrade = (trade: ITrade) => {
    const playerAIdx = findIndex(allPlayers, (p) => p.name === trade.playerA.name)
    const playerBIdx = findIndex(allPlayers, (p) => p.name === trade.playerB.name)

    const teamA = allPlayers[playerAIdx]['team']
    const teamB = allPlayers[playerBIdx]['team']

    allPlayers[playerAIdx]['team'] = teamB
    allPlayers[playerBIdx]['team'] = teamA

    remove(trades, (t) => isEqual(t, trade))

    updateAllPlayers(allPlayers)
    setTrades(trades)
    forceUpdate()
  }

  const teamPlayers = allPlayers.filter(p => p.team === team);
  const otherPlayers = difference(allPlayers, teamPlayers);
  const sortedPlayers = sortBy(teamPlayers, (p) => p.salary).reverse();

  const maxSalary = max(map(allPlayers, (p) => p.salary));
  const salaries = map(sortedPlayers, (p) => p.salary);
  const teamSalary = sum(salaries);
  const { salaryCap, salaryFloor } = calcSalaryLimits(allPlayers);
  const overCap = teamSalary > salaryCap;
  const underFloor = teamSalary < salaryFloor;

  const layoutStyle = {
    display: 'flex' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'space-around' as const,
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
            onChange={teamChanged}
          />
          <TeamTable
            teamPlayers={sortedPlayers}
            teamSalary={teamSalary}
            salaryCap={salaryCap}
            salaryFloor={salaryFloor}
            openTradeModal={openTradeModal}
          />
        </div>
        <div style={chartStyle}>
          <Tabs
            value={tab}
            onChange={tabChanged}
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
              maxSalary={maxSalary!}
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
              removeTrade={removeTrade}
            />
          }
        </div>
      </div>
      <TradeModal
        open={modalOpen}
        trades={trades}
        players={otherPlayers}
        playerA={playerA}
        playerB={playerB}
        overCap={overCap}
        updateTrade={updateTrade}
        submitTrade={applyTrade}
        onClose={closeTradeModal}
      />
    </Container>
  )
}
