import React from 'react'
import { Bar } from 'react-chartjs-2'
import format from 'format-number'
import { colors, underColors, overColors } from '../../helpers'

interface BarChartProps {
  players: {name: string, salary: number}[]
  maxSalary: number;
  overCap: boolean;
  underFloor: boolean;
}

export default function BarChart(props: BarChartProps) {
  const { players, maxSalary, overCap, underFloor } = props;

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
    legend: {
      display: false
    },
    tooltips: {
      callbacks: {
        label: (tooltipItem: any, data: any) => {
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
          min: 0,
          max: maxSalary,
          callback: (data: any) => {
            const value = Math.round(data)
            const text = format({prefix: '$'})(value)
            return  text
          }
        }
      }]
    }
  }

  const chartStyle = {
    marginTop: 20
  }

  return (
    <div style={chartStyle}>
      <Bar data={data} height={340} options={options}/>
    </div>
  )
}
