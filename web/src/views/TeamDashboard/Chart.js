import React, { Component } from 'react'
import { Pie } from 'react-chartjs-2'
import { colors, warnColors, dangerColors } from '../../helpers'

export default class Chart extends Component {
  render () {
    const { players, overCap, underFloor } = this.props;

    let teamColors = colors;
    if (overCap) {
      teamColors = dangerColors;
    } else if (underFloor) {
      teamColors = warnColors;
    }

    const altColors = overCap ? warnColors : dangerColors;
    const chartColors = players.map((p, i) => p.salary < 0 ? altColors[i] : teamColors[i]);

    const data = {
      labels: players.map (p => p.name),
      datasets: [{
        data: players.map (p => Math.abs(p.salary)),
        backgroundColor: chartColors
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
