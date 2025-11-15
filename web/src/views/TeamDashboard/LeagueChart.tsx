import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Bar } from 'react-chartjs-2';
import {
  groupBy,
  sortBy,
  meanBy,
  map,
  fromPairs,
  keys,
  values,
  max,
  min,
  difference,
} from 'lodash';
import { Player } from '../../api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, annotationPlugin);

interface LeagueChartProps {
  players: Player[];
  teamNames: string[];
  salaryCap: number;
  salaryFloor: number;
}

interface ChartDataset {
  label: string;
  stack: string;
  data: Array<{ x: string; y: number }>;
  backgroundColor: string;
  hoverBackgroundColor: string;
  categoryPercentage: number;
  barPercentage: number;
}

export default function Chart(props: LeagueChartProps): React.ReactElement {
  const { players, teamNames, salaryCap, salaryFloor } = props;

  const data = {
    labels: teamNames,
    datasets: flatten(
      teamNames.map(team => {
        const teamPlayers = sortBy(
          players.filter(p => p.team === team),
          p => p.salary
        );

        return teamPlayers.map((player, idx) => {
          const teamSalary = sum(map(teamPlayers, p => p.salary));

          let teamColors = colors;

          if (teamSalary > salaryCap) {
            teamColors = overColors;
          } else if (teamSalary < salaryFloor) {
            teamColors = underColors;
          }

          return {
            label: player.name,
            stack: team,
            data: [{ x: team, y: player.salary }],
            backgroundColor: teamColors[idx],
            hoverBackgroundColor: teamColors[idx],
            categoryPercentage: 0.2,
            barPercentage: 24.0,
          } as ChartDataset;
        });
      })
    ),
  };

  const options: ChartOptions<'bar'> = {
    scales: {
      x: {
        display: false,
      },
      y: {
        stacked: true,
        beginAtZero: true,
        suggestedMax: Math.round(salaryCap * 1.1),
        ticks: {
          callback: function (
            this: Scale<CoreScaleOptions>,
            tickValue: string | number,
            _index: number,
            _ticks: Tick[]
          ) {
            const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
            const salary = Math.round(value);
            return format({ prefix: '$' })(salary);
          },
        },
      },
    },
    animation: {
      duration: 0,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        position: 'nearest' as keyof TooltipPositionerMap,
        callbacks: {
          title: (items: { datasetIndex: number }[]) => {
            const item = data.datasets[items[0].datasetIndex];
            return item.stack;
          },
          label: (item: { datasetIndex: number; dataIndex: number }) => {
            const dataset = data.datasets[item.datasetIndex];
            const value = dataset.data[item.dataIndex];

            const salary = Math.round(value.y);
            const text = format({ prefix: '$' })(salary);

            return `${dataset.label} ${text}`;
          },
        },
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
              yAdjust: -14,
            },
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
              yAdjust: 14,
            },
          },
        },
      },
    },
  };

  const chartStyle = {
    marginTop: 20,
    position: 'relative' as const,
  };

  return (
    <div style={chartStyle}>
      <Bar data={data} height={300} redraw={true} options={options} />
    </div>
  );
}
