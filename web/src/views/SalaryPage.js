import React, { Component } from 'react'
import Layout from '../layout'
import Loading from '../components/Loading'
import LeaguePicker from '../components/LeaguePicker'
import { currentLeague } from '../leagues'
import { fetchPlayers } from "../api"

class SalaryProvider extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loading: true,
      players: [],
    }
  }

  componentDidMount () {
    const league = currentLeague()
    return (async () => {
      const players = await fetchPlayers(league)
      this.setState({players, loading: false})
    })()
  }

  leagueChange (league) {
    return (async () => {
      this.setState({loading: true})
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
    const leagueChange = this.leagueChange.bind(this)

    return (
      <div>
        <Layout>
          <LeaguePicker onChange={leagueChange} />
        </Layout>
        { this.renderMain() }
      </div>
    )
  }
}

export default SalaryProvider
