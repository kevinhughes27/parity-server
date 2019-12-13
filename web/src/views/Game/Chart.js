import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import InputLabel from '@material-ui/core/InputLabel'
import MenuItem from '@material-ui/core/MenuItem'
import FormControl from '@material-ui/core/FormControl'
import Select from '@material-ui/core/Select'
import withSizes from 'react-sizes'
import { Bar } from 'react-chartjs-2'
import { map, keys, sortBy } from 'lodash'

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

function BarChart (props) {
  const classes = useStyles();

  const [stat, setStat] = React.useState('goals');

  const players = map(keys(props.stats), (k) => {
    return { name: k, ...props.stats[k] }
  })

  const sortedPlayers = sortBy(players, (p) => -p[stat])

  const data = {
    labels: sortedPlayers.map (p => p.name),
    datasets: [{
      data: sortedPlayers.map (p => p[stat]),
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
        label: (tooltipItem, data) => {
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

  const chartProps = props.isMobile
    ? { height: 200, width: props.width - 20 }
    : { height: 340 }

  const inputLabel = React.useRef(null);
  const [labelWidth, setLabelWidth] = React.useState(0);
  React.useEffect(() => {
    setLabelWidth(inputLabel.current.offsetWidth);
  }, []);

  const handleChange = event => {
    setStat(event.target.value);
  };

  return (
    <div className={classes.container}>
      <FormControl variant="outlined" className={classes.formControl}>
        <InputLabel ref={inputLabel}>
          Stat
        </InputLabel>
        <Select
          value={stat}
          onChange={handleChange}
          labelWidth={labelWidth}
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

const mapSizesToProps = ({ width }) => ({
  isMobile: width < 780,
  width: width
})

export default withSizes(mapSizesToProps)(BarChart)
