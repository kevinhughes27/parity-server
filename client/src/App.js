// @flow

let $ = window.$
import _ from 'lodash'
import React, { Component } from 'react'
import Nav from './Nav'
import { Link } from 'react-router'
import Stats from './Stats'
import Loading from './Loading'

class App extends Component {
  state: {
    loading: boolean,
    weeks: any,
    week: number,
  }

  constructor (props: any) {
    super(props)

    this.state = {
      loading: true,
      weeks: [],
      week: 0
    }
  }

  componentWillMount () {
    this._fetchWeeks()
  }

  _fetchWeeks () {
    $.get('weeks', (weeks) => {
      let week = _.last(weeks) || 0
      this.setState({ weeks: weeks, week: week, loading: false })
    })
  }

  weekChange (week: number) {
    this.setState({week: week})
  }

  render () {
    if (this.state.loading) return (<Loading />)

    let week = this.state.week
    let weeks = [0, ...this.state.weeks]

    let weekChange = this.weekChange.bind(this)

    return (
      <div>
        <Nav week={week} weeks={weeks} weekChange={weekChange}>
          <li><Link to="/">Stats</Link></li>
          <li><Link to="/compare_teams">Compare Teams</Link></li>
          <li><Link to="/compare_players">Compare Players</Link></li>
          <li>
            <a href="https://github.com/kevinhughes27/parity-server" target="_blank">
              <i className="fa fa-3x fa-github" aria-hidden="true"></i>
            </a>
          </li>
        </Nav>

        <div className="container" style={{height: '100%', minHeight: '100%'}}>
          { this.props.children
            ? React.cloneElement(this.props.children, {week: week})
            : <Stats week={week}/>
          }
        </div>
      </div>
    )
  }
}

export default App
