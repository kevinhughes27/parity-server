import React, { Component } from 'react'
import { Bar } from 'react-chartjs-2'
import format from 'format-number'
import { overColors } from '../../helpers'
import { map, keys, sortBy } from 'lodash'

const chartStyle = {
  marginTop: 20
}

export default class BarChart extends Component {
  render () {
    const { stats, stat } = this.props;

    const teamColors = overColors;

    const players = map(keys(stats), (k) => {
      return { name: k, ...stats[k] }
    })

    const sortedPlayers = sortBy(players, (p) => -p[stat])

    const data = {
      labels: sortedPlayers.map (p => p.name),
      datasets: [{
        data: sortedPlayers.map (p => p[stat]),
        backgroundColor: teamColors
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
            // const salary = Math.round(value)
            // const text = format({prefix: '$'})(salary)
            const text = format(value)
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
            min: 0
          }
        }]
      }
    }

    return (
      <div style={chartStyle}>
        <Bar data={data} height={280} options={options}/>
      </div>
    )
  }
}
