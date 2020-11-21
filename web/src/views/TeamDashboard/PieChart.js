import React from 'react'
import { Pie } from 'react-chartjs-2'
import format from 'format-number'
import { colors, underColors, overColors } from '../../helpers'

export default function PieChart(props) {
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
    legend: {
      display: false
    },
    tooltips: {
      callbacks: {
        label: (tooltipItem, data) => {
          const value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index]
          const label = data.labels[tooltipItem.index]

          const salary = Math.round(value)
          const text = format({prefix: '$'})(salary)

          return label + ' ' + text
        }
      }
    },
  };

  return <Pie data={data} height={340} options={options}/>
}
