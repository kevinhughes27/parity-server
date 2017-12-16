import _ from 'lodash'
import React, { Component } from 'react'
import MoneyCell from '../MoneyCell'

export default class Table extends Component {
  render () {
    const { players, teamSalary, salaryCap, salaryFloor } = this.props;

    return (
      <table className='highlight'>
      <thead>
        <tr>
          <th>Player</th>
          <th>Salary</th>
        </tr>
      </thead>
        <tbody>
          { _.map(players, (player) => {
            return (
              <tr key={player.name} style={{lineHeight: 0.5}}>
                <td>{player.name}</td>
                <td><MoneyCell data={player.salary}/></td>
              </tr>
            )
          })}
          <tr style={{borderTop: '1px solid grey', lineHeight: 0.5}}>
            <td>Current Salary</td>
            <td><MoneyCell data={teamSalary}/></td>
          </tr>
          <tr style={{lineHeight: 0.5}}>
            <td>League Salary Floor</td>
            <td><MoneyCell data={salaryFloor}/></td>
          </tr>
            <tr style={{lineHeight: 0.5}}>
            <td>Team Floor Clearance</td>
            <td><MoneyCell data={teamSalary - salaryFloor}/></td>
          </tr>
          <tr style={{lineHeight: 0.5}}>
            <td>League Salary Cap</td>
            <td><MoneyCell data={salaryCap}/></td>
          </tr>
          <tr style={{lineHeight: 0.5}}>
            <td><b>Team Cap Space</b></td>
            <td><MoneyCell data={salaryCap - teamSalary}/></td>
          </tr>
        </tbody>
      </table>
    )
  }
}
