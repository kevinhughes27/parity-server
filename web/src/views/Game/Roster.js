import _ from 'lodash'
import React from 'react'

const Roster = ({players}) => (
  <ul className='collection'>
    { _.map(players, (player) => {
      return (
        <li key={player} className='collection-item' style={{lineHeight: '1.0rem'}}>
          {player}
        </li>
      )
    })}
  </ul>
)

export default Roster
