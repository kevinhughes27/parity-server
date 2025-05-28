import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  TooltipPositionerMap,
  Scale,
  CoreScaleOptions
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

interface Player {
  name: string;
  team: string;
  salary: number;
}

interface LeagueChartProps {
  players: Player[];
  teamNames: string[];
  salaryCap: number;
  salaryFloor: number;
}

interface ChartDataset {
  label: string;
  stack: string;
  data: Array<{x: string; y: number}>;
  backgroundColor: string;
  hoverBackgroundColor: string;
  categoryPercentage: number;
  barPercentage: number;
}

export default function Chart(props: LeagueChartProps): React.ReactElement {
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
        } as ChartDataset
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
          callback: function(this: Scale<CoreScaleOptions>, tickValue: number | string) {
            return format({prefix: '$'})(Math.round(Number(tickValue)))
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
      tooltip: {
        position: 'nearest' as keyof TooltipPositionerMap,
        callbacks: {
          title: (items: { datasetIndex: number }[]) => {
            const item = data.datasets[items[0].datasetIndex]
            return item.stack
          },
          label: (item: { datasetIndex: number; dataIndex: number }) => {
            const dataset = data.datasets[item.datasetIndex]
            const value = dataset.data[item.dataIndex]
            return `${dataset.label} ${format({prefix: '$'})(Math.round(value.y))}`
          }
        }
      },
      annotation: {
        annotations: {
          cap: {
            type: 'line' as const,
            yMin: salaryCap,
            yMax: salaryCap,
            borderColor: 'black',
            borderWidth: 2,
            label: {
              display: true,
              content: 'Salary Cap',
              position: 'end' as const,
              backgroundColor: 'white',
              color: 'black',
              padding: 4,
              xAdjust: 0,
              yAdjust: -14
            }
          },
          floor: {
            type: 'line' as const,
            yMin: salaryFloor,
            yMax: salaryFloor,
            borderColor: 'black',
            borderWidth: 2,
            label: {
              display: true,
              content: 'Salary Floor',
              position: 'start' as const,
              backgroundColor: 'white',
              color: 'black',
              padding: 4,
              xAdjust: 0,
              yAdjust: 14
            }
          }
        }
      }
    }
  }

  const chartStyle = {
    marginTop: 20,
    position: 'relative' as const
  }

  return (
    <div style={chartStyle}>
      <Bar data={data} height={300} redraw={true} options={options}/>
    </div>
  )
}
