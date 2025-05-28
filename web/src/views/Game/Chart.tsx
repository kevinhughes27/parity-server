import React from 'react'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import { useMediaQuery } from 'react-responsive'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { map, keys, sortBy } from 'lodash'
import { Stats } from '../../api'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
)

interface BarChartProps {
  stats: Stats;
  statMaxes: Record<string, number>;
  colors: string[];
}

function BarChart(props: BarChartProps) {
  const isMobile = useMediaQuery({ query: '(max-device-width: 480px)' });

  const [stat, setStat] = React.useState('goals');

  const players = map(keys(props.stats), (k) => {
    return {...props.stats[k], name: k}
  })

  const sortedPlayers = sortBy(players, (p: { [key: string]: number | string }) => -(p[stat] as number))

  const data = {
    labels: sortedPlayers.map (p => p.name),
    datasets: [{
      data: sortedPlayers.map ((p: { [key: string]: number | string }) => p[stat] as number),
      backgroundColor: props.colors
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    aspectRatio: 1,
    plugins: {
      legend: {
        display: false
      },
      tooltips: {
        callbacks: {
          label: (tooltipItem: { datasetIndex: number; index: number }, data: { datasets: { data: number[] }[] }) => {
            return data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index]
          }
        }
      },
    },
    scales: {
      x: {
        ticks: {
          display: false
        }
      },
      y: {
        ticks: {
          min: 0,
          stepSize: 1,
          max: props.statMaxes[stat]
        }
      }
    }
  }

  const chartProps = isMobile
    ? { height: 200 }
    : { height: 340 }

  const handleChange = (event: SelectChangeEvent) => {
    setStat(event.target.value as string);
  };

  return (
    <div style={{position: 'relative'}}>
      <FormControl variant="outlined" sx={{
          margin: 2,
          minWidth: 120,
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'white'
        }}>
        <InputLabel id="stat-select">
          Stat
        </InputLabel>
        <Select
          variant="standard"
          labelId="stat-select"
          label="Stat"
          value={stat}
          onChange={handleChange}>
          <MenuItem value={'goals'}>Goals</MenuItem>
          <MenuItem value={'assists'}>Assists</MenuItem>
          <MenuItem value={'second_assists'}>Second Assists</MenuItem>
          <MenuItem value={'d_blocks'}>D Blocks</MenuItem>
          <MenuItem value={'catches'}>Catches</MenuItem>
          <MenuItem value={'completions'}>Completions</MenuItem>
          <MenuItem value={'throw_aways'}>Throw Aways</MenuItem>
          <MenuItem value={'threw_drops'}>Threw Drops</MenuItem>
          <MenuItem value={'drops'}>Drops</MenuItem>
        </Select>
      </FormControl>
      <Bar data={data} {...chartProps} options={options}/>
    </div>
  );
}

export default BarChart
