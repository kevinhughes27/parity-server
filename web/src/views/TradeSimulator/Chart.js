import React, { Component } from 'react'
import { Bar } from 'react-chartjs-2'
import { colors, warnColors, dangerColors } from '../../helpers'
import 'chartjs-plugin-annotation'
import { flatten, sortBy, map, sum } from 'lodash'

export default class Chart extends Component {
  render () {
    const { players, teamNames, salaryCap, salaryFloor } = this.props

    const data = {
      labels: teamNames,
      datasets: flatten(teamNames.map(team => {
        const teamPlayers = sortBy(players.filter((p) => p.team === team), (p) => p.salary)
        return teamPlayers.map((player, idx) => {
          const teamSalary = sum(map(teamPlayers, (p) => p.salary))

          let teamColors = colors;

          if (teamSalary > salaryCap) {
            teamColors = dangerColors;
          } else if (teamSalary < salaryFloor) {
            teamColors = warnColors;
          }

          return {
            type: 'bar',
            label: player.name,
            stack: team,
            data: [player.salary],
            backgroundColor: teamColors[idx],
            hoverBackgroundColor: teamColors[idx]
          }
        })
      }))
    }

    const options = {
      legend: {
        display: false
      },
      tooltips: {
        callbacks: {
          title: (tooltipItem, data) => {
            const item = data.datasets[tooltipItem[0].datasetIndex]
            return item.stack
          }
        }
      },
      scales: {
        xAxes: [{
          barPercentage: 0.6,
          categoryPercentage: 1.0,
          ticks: {
            autoSkip: false
          }
        }],
        yAxes: [{
          stacked: true,
          ticks: {
            min: 0,
            suggestedMax: Math.round(salaryCap * 1.1)
          }
        }]
      },
      animation: {
        duration: 0
      },
      annotation: {
        annotations: [{
          type: 'line',
          mode: 'horizontal',
          scaleID: 'y-axis-0',
          value: salaryCap,
          borderColor: 'black',
          borderWidth: 2,
          label: {
            position: 'right',
            backgroundColor: 'black',
            content: 'Salary Cap',
            enabled: true
          }
        },
        {
          type: 'line',
          mode: 'horizontal',
          scaleID: 'y-axis-0',
          value: salaryFloor,
          borderColor: 'black',
          borderWidth: 2,
          label: {
            position: 'left',
            backgroundColor: 'black',
            content: 'Salary Floor',
            enabled: true
          }
        }]
      }
    }

    return <Bar data={data} redraw={true} options={options}/>
  }
}
