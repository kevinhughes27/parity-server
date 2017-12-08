import _ from 'lodash'
import React from 'react'

const Roster = ({title, players}) => (
  <div className='col s6'>
    <h5>{title}</h5>
    <ul className='collection'>
      { _.map(players, (player) => {
        return (
          <li className='collection-item' key={player}>
            {player}
          </li>
        )
      })}
    </ul>
  </div>
)

export default Roster
