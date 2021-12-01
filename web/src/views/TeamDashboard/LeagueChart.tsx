import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import format from 'format-number'
import annotationPlugin from 'chartjs-plugin-annotation'
import { flatten, sortBy, map, sum } from 'lodash'
import { colors, underColors, overColors } from '../../helpers'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  annotationPlugin
)

interface LeagueChartProps {
  players: {name: string, team: string, salary: number}[]
  teamNames: string[];
  salaryCap: number;
  salaryFloor: number;
}

export default function Chart(props: LeagueChartProps) {
  const { players, teamNames, salaryCap, salaryFloor } = props

  const data = {
    labels: teamNames,
    datasets: flatten(teamNames.map(team => {
      const teamPlayers = sortBy(players.filter((p) => p.team === team), (p) => p.salary)

      return teamPlayers.map((player, idx) => {
        const teamSalary = sum(map(teamPlayers, (p) => p.salary))

        let teamColors = colors;

        if (teamSalary > salaryCap) {
          teamColors = overColors;
        } else if (teamSalary < salaryFloor) {
          teamColors = underColors;
        }

        return {
          label: player.name,
          stack: team,
          data: [{x: team, y: player.salary}],
          backgroundColor: teamColors[idx],
          hoverBackgroundColor: teamColors[idx],
          categoryPercentage: 0.2,
          barPercentage: 24.0
        }
      })
    }))
  }

  const options = {
    scales: {
      x: {
        display: false,
      },
      y: {
        stacked: true,
        ticks: {
          min: 0,
          suggestedMax: Math.round(salaryCap * 1.1),
          callback: (data: any) => {
            const value = Math.round(data)
            const text = format({prefix: '$'})(value)
            return  text
          }
        }
      }
    },
    animation: {
      duration: 0
    },
    plugins: {
      legend: {
        display: false
      },
      tooltips: {
        callbacks: {
          title: (tooltipItem: any, data: any) => {
            const item = data.datasets[tooltipItem[0].datasetIndex]
            return item.stack
          },
          label: (tooltipItem: any, data: any) => {
            const item = data.datasets[tooltipItem.datasetIndex]
            const value = item.data[tooltipItem.index]

            const salary = Math.round(value)
            const text = format({prefix: '$'})(salary)

            return item.label + ' ' + text
          }
        }
      },
      annotation: {
        annotations: {
          cap: {
            type: 'line' as 'line',
            scaleID: 'y',
            value: salaryCap,
            borderColor: 'black',
            borderWidth: 2,
            label: {
              position: 'end' as 'end',
              backgroundColor: 'black',
              content: 'Salary Cap',
              enabled: true
            }
          },
          floor: {
            type: 'line' as 'line',
            scaleID: 'y',
            value: salaryFloor,
            borderColor: 'black',
            borderWidth: 2,
            label: {
              position: 'start' as 'start',
              backgroundColor: 'black',
              content: 'Salary Floor',
              enabled: true
            }
          }
        }
      }
    }
  }

  const chartStyle = {
    marginTop: 20
  }

  return (
    <div style={chartStyle}>
      <Bar data={data} height={300} redraw={true} options={options}/>
    </div>
  )
}
