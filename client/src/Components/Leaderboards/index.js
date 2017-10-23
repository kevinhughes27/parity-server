// @flow

import _ from 'lodash'
import React, { Component } from 'react'
import Stats from '../../Stores/Stats'

type Props = {
  week: number,
  stats: Stats
}

export default class Leaderboards extends Component {
  props: Props
  state: {
    week: number,
    stats: Stats
  }

  constructor (props: Props) {
    super(props)

    this.state = {
      week: this.props.week,
      stats: this.props.stats
    }
  }

  renderBoard (stat: string) {
    let stats = this.state.stats
    let players = stats.topPlayers(stat, 10)

    return (
      <div className="card-panel" style={{minWidth: 300, margin: 20}}>
        <h5>{stat}</h5>
        <table className='highlight'>
          <tbody>
            { _.map(players, (player) => {
              return (
                <tr key={player['Name']} style={{lineHeight: 0.5}}>
                  <td>{player['Name']}</td>
                  <td>{player[stat]}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  render () {
    return (
      <div style={{display: 'flex', flexWrap: 'wrap'}}>
        { this.renderBoard('goals') }
        { this.renderBoard('assists') }
        { this.renderBoard('catches') }
        { this.renderBoard('completions') }
        { this.renderBoard('d_blocks') }
        { this.renderBoard('throw_aways') }
        { this.renderBoard('drops') }
      </div>
    )
  }
}
