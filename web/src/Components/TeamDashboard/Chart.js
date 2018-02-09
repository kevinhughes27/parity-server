import React, { Component } from 'react'
import { Pie } from 'react-chartjs-2'
import { colors, warnColors } from '../helpers'

export default class Chart extends Component {
  render () {
    const { players, overCap } = this.props;

    const data = {
      labels: players.map (p => p.name),
      datasets: [{
        data: players.map (p => p.salary),
        backgroundColor: overCap ? warnColors : colors
      }]
    };

    const options = {
      legend: {
        display: false
      }
    }

    return <Pie data={data} height={400} options={options}/>
  }
}
