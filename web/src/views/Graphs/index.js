import React from 'react'
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'
import CompareTwo from './CompareTwo'
import BarChart from './BarChart'

export default function Graphs(props) {
  const [value, setValue] = React.useState(0);

  const handleChange = (_event, newValue) => {
    setValue(newValue);
  };

  return (
    <div style={{paddingTop: '10px'}}>
      <Tabs
        value={value}
        onChange={handleChange}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
      >
        <Tab label="Stat Distribution" />
        <Tab label="Compare Two" />
      </Tabs>
      { value === 0 &&
        <BarChart stats={props.stats} />
      }
      { value === 1 &&
        <CompareTwo stats={props.stats} />
      }
    </div>
  )
}
