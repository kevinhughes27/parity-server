import React, { Component } from 'react'
import { Bar } from 'react-chartjs-2'
import format from 'format-number'
import { colors, warnColors, dangerColors } from '../../helpers'

const chartStyle = {
  marginTop: 20
}

export default class BarChart extends Component {
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
      },
      tooltips: {
        callbacks: {
          label: (tooltipItem, data) => {
            const value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index]
            const salary = Math.round(value)
            const text = format({prefix: '$'})(salary)
            return text
          }
        }
      },
      scales: {
        xAxes: [{
          ticks: {
            autoSkip: false
          }
        }],
        yAxes: [{
          ticks: {
            callback: (data) => {
              const value = Math.round(data)
              const text = format({prefix: '$'})(value)
              return  text
            }
          }
        }]
      }
    }

    return (
      <div style={chartStyle}>
        <Bar data={data} height={340} options={options}/>
      </div>
    )
  }
}
