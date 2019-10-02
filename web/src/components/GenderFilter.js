import React, { Component } from 'react'
import InputLabel from '@material-ui/core/InputLabel'
import MenuItem from '@material-ui/core/MenuItem'
import FormControl from '@material-ui/core/FormControl'
import Select from '@material-ui/core/Select'

export default class GenderFilter extends Component {
  render () {
    const { filter, onChange } = this.props

    return (
      <FormControl>
        <InputLabel>Gender: </InputLabel>
        <Select
          value={filter || 'any'}
          onChange={onChange}
        >
          <MenuItem value={''}>Any</MenuItem>
          <MenuItem value={'female'}>Female</MenuItem>
          <MenuItem value={'male'}>Male</MenuItem>
        </Select>
      </FormControl>
    )
  }
}
