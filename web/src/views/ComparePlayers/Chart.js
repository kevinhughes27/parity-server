import React, { Component } from 'react'
import { Bar } from 'react-chartjs-2'

export default class Chart extends Component {
  render () {
    const {
      labels,
      playerAName,
      playerAStats,
      playerBName,
      playerBStats
    } = this.props

    const data = {
      labels: labels,
      datasets: [
        {
          label: playerAName,
          data: Object.values(playerAStats),
          backgroundColor: '#98abc5'
        },
        {
          label: playerBName,
          data: Object.values(playerBStats),
          backgroundColor: '#ff8c00'
        }
      ]
    }

    const options = {
      legend: {
        display: false
      }
    }

    return <Bar data={data} redraw={true} options={options}/>
  }
}
