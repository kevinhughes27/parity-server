import _ from 'lodash'
import React, { Component } from 'react'
import capitalize from 'capitalize'

function topPlayers(stats, stat, num) {
  return _.sortBy(stats, (p) => { return -p[stat] }).slice(0, num)
}

export default class Table extends Component {
  render () {
    const { stat, stats } = this.props

    const statsArray = _.map(_.keys(stats), (k) => {
      return { name: k, ...stats[k] }
    })

    const players = topPlayers(statsArray, stat, 10)
    const statTitle = capitalize.words(stat.replace(/_/g, ' '))

    return (
      <div key={stat} className="card-panel" style={{minWidth: 300, margin: 20}}>
        <h5>{statTitle}</h5>
        <table className='highlight'>
          <tbody>
            { _.map(players, (player) => {
              return (
                <tr key={player['name']} style={{lineHeight: 0.5}}>
                  <td>{player['name']}</td>
                  <td>{player[stat]}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }
}
