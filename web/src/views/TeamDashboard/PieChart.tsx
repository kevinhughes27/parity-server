import React from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Pie } from 'react-chartjs-2'
import format from 'format-number'
import { colors, underColors, overColors } from '../../helpers'

ChartJS.register(ArcElement, Tooltip, Legend)

interface PieChartProps {
  players: {name: string, salary: number}[]
  overCap: boolean;
  underFloor: boolean;
}

export default function PieChart(props: PieChartProps) {
  const { players, overCap, underFloor } = props;

  let teamColors = colors;

  if (overCap) {
    teamColors = overColors;
  } else if (underFloor) {
    teamColors = underColors;
  }

  const data = {
    labels: players.map (p => p.name),
    datasets: [{
      data: players.map (p => Math.abs(p.salary)),
      backgroundColor: teamColors
    }]
  };

  const options = {
    plugins: {
      legend: {
        display: false
      },
      tooltips: {
        callbacks: {
          label: (tooltipItem: any, data: any) => {
            const value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index]
            const label = data.labels[tooltipItem.index]

            const salary = Math.round(value)
            const text = format({prefix: '$'})(salary)

            return label + ' ' + text
          }
        }
      }
    }
  };

  return <Pie data={data} height={340} options={options}/>
}
