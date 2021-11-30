import React from 'react'
import makeStyles from '@mui/styles/makeStyles';
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import { useMediaQuery } from 'react-responsive'
import { Bar } from 'react-chartjs-2'
import { map, keys, sortBy } from 'lodash'
import { Stats } from '../../api'

interface BarChartProps {
  stats: Stats;
  statMaxes: any;
  colors: string[];
}

const useStyles = makeStyles(theme => ({
  container: {
    marginTop: 20,
    textAlign: 'right',
    position: 'relative'
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
    position: 'absolute',
    top: 20,
    right: 20,
    background: 'white'
  },
  select: {
    textAlign: 'left'
  },
  selectEmpty: {
    marginTop: theme.spacing(2),
  },
}));

function BarChart(props: BarChartProps) {
  const classes = useStyles();
  const isMobile = useMediaQuery({ query: '(max-device-width: 480px)' });

  const [stat, setStat] = React.useState('goals');

  const players = map(keys(props.stats), (k) => {
    return {...props.stats[k], name: k}
  })

  const sortedPlayers = sortBy(players, (p: any) => -p[stat])

  const data = {
    labels: sortedPlayers.map (p => p.name),
    datasets: [{
      data: sortedPlayers.map ((p: any) => p[stat]),
      backgroundColor: props.colors
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    aspectRatio: 1,
    legend: {
      display: false
    },
    tooltips: {
      callbacks: {
        label: (tooltipItem: any, data: any) => {
          return data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index]
        }
      }
    },
    scales: {
      xAxes: [{
        ticks: {
          display: false
        }
      }],
      yAxes: [{
        ticks: {
          min: 0,
          stepSize: 1,
          max: props.statMaxes[stat]
        }
      }]
    }
  }

  const chartProps = isMobile
    ? { height: 200 }
    : { height: 340 }

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setStat(event.target.value as string);
  };

  return (
    <div className={classes.container}>
      <FormControl variant="outlined" className={classes.formControl}>
        <InputLabel id="stat-select">
          Stat
        </InputLabel>
        <Select
          labelId="stat-select"
          label="Stat"
          value={stat}
          onChange={handleChange}
          className={classes.select}
        >
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
  )
}

export default BarChart
