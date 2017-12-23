import _ from 'lodash'
import React, { Component } from 'react'
import Roster from './Roster'


export default class Team extends Component {
  render () {
    const { team, score, winner, players, game } = this.props

    const iconJsx = winner
      ? <i className="fa fa-star" />
      : null

    const events = _.flatten(_.map(game.points, (p) => p.events))
    const teamEvents = _.filter(events, (ev) => {
      return _.includes(players, ev.firstActor)
    })

    const defenseEvents = _.filter(teamEvents, (ev) => ev.type === 'DEFENSE')
    const passEvents = _.filter(teamEvents, (ev) => ev.type === 'PASS')
    const throwAwayEvents = _.filter(teamEvents, (ev) => ev.type === 'THROWAWAY')
    const dropEvents = _.filter(teamEvents, (ev) => ev.type === 'DROP')

    return (
      <div>
        <h5>{iconJsx} {team}</h5>

        <ul className='collection'>
          { this.renderStat('Points', score, true) }
          { this.renderStat('Defense', defenseEvents.length) }
          { this.renderStat('Completions', passEvents.length) }
          { this.renderStat('Throw Aways', throwAwayEvents.length) }
          { this.renderStat('Drops', dropEvents.length) }
        </ul>

        <strong>Roster:</strong>
        <Roster players={players} />
      </div>
    )
  }

  renderStat(name, value, bold) {
    const styles = {display: 'flex', flex: 1, justifyContent: 'space-between'}

    if (bold) {
      styles['fontWeight'] = 'bold'
    }

    return (
      <li className='collection-item' style={styles}>
        <span>{ name }</span>
        <span>{ value }</span>
      </li>
    )
  }
}
