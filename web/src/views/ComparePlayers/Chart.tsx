import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { StatLine } from '../../api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface ChartProps {
  labels: string[];
  playerAName: string;
  playerAStats: StatLine;
  playerBName: string;
  playerBStats: StatLine;
}

export default function Chart(props: ChartProps) {
  const { labels, playerAName, playerAStats, playerBName, playerBStats } = props;

  const data = {
    labels: labels,
    datasets: [
      {
        label: playerAName,
        data: Object.values(playerAStats),
        backgroundColor: '#98abc5',
      },
      {
        label: playerBName,
        data: Object.values(playerBStats),
        backgroundColor: '#ff8c00',
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return <Bar data={data} redraw={true} options={options} />;
}
