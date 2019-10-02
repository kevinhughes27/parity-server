import 'whatwg-fetch'
import React, { Component } from 'react'
import TopNav from '../layout/TopNav'
import Loading from '../components/Loading'

const fetchPlayers = async () => {
  const response = await fetch('/api/players')
  return await response.json()
}

class SalaryProvider extends Component {
  constructor (props) {
    super(props)

    this.state = {
      loading: true,
      players: [],
    }
  }

  componentDidMount () {
    (async () => {
      const players = await fetchPlayers()
      this.setState({players, loading: false})
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
    return (
      <div>
        <TopNav />
        { this.renderMain() }
      </div>
    )
  }
}

export default SalaryProvider
