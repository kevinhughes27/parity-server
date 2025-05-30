import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,
  Scale,
  CoreScaleOptions,
  Tick,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import format from 'format-number';
import { colors, underColors, overColors } from '../../helpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface BarChartProps {
  players: { name: string; salary: number }[];
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
    labels: players.map(p => p.name),
    datasets: [
      {
        data: players.map(p => Math.abs(p.salary)),
        backgroundColor: teamColors,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem: TooltipItem<'bar'>) {
            const value = tooltipItem.raw as number;
            const salary = Math.round(value);
            const text = format({ prefix: '$' })(salary);
            return text;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          autoSkip: false,
        },
      },
      y: {
        beginAtZero: true,
        max: maxSalary,
        ticks: {
          callback: function (
            this: Scale<CoreScaleOptions>,
            tickValue: string | number,
            _index: number,
            _ticks: Tick[]
          ) {
            const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
            const salary = Math.round(value);
            const text = format({ prefix: '$' })(salary);
            return text;
          },
        },
      },
    },
  };

  const chartStyle = {
    marginTop: 20,
  };

  return (
    <div style={chartStyle}>
      <Bar data={data} height={340} options={options} />
    </div>
  );
}
