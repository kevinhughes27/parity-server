import React, { Component } from 'react'
import TopNav from '../layout/TopNav'
import Loading from '../components/Loading'
import LeaguePicker from '../components/LeaguePicker'
import { fetchLeagues, fetchPlayers } from "../api"

const defaultLeague = 10

class SalaryProvider extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loading: true,
      leagues: [],
      league: '',
      players: [],
    }
  }

  componentDidMount () {
    const league = defaultLeague
    return (async () => {
      const leagues = await fetchLeagues()
      const players = await fetchPlayers(league)
      this.setState({leagues, league, players, loading: false})
    })()
  }

  leagueChange (event) {
    const league = event.target.value
    return (async () => {
      this.setState({league, loading: true})
      const players = await fetchPlayers(league)
      this.setState({ players, loading: false })
    })()
  }

  renderMain () {
    const { loading, players } = this.state

    if (loading) return (<Loading />)

    return (
      <div className="container" style={{height: '100%', minHeight: '100%'}}>
        { React.cloneElement(this.props.children, {players: players}) }
      </div>
    )
  }

  render () {
    const league = this.state.league
    const leagues = [...this.state.leagues]
    const leagueChange = this.leagueChange.bind(this)

    return (
      <div>
        <TopNav>
          <LeaguePicker league={league} leagues={leagues} onChange={leagueChange} />
        </TopNav>
        { this.renderMain() }
      </div>
    )
  }
}

export default SalaryProvider
