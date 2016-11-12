// @flow

import React, { Component } from 'react'
import Autosuggest from 'react-autosuggest'

export default class PlayerSelect extends Component {
  props: Props

  state: {
    value: string,
    suggestions: array
  }

  constructor (props: Props) {
    super(props)

    this.state = {
      value: '',
      suggestions: []
    }
  }

  onChange = (event, { newValue }) => {
    this.setState({ value: newValue })
  }

  onSuggestionsFetchRequested = ({ value }) => {
    this.setState({ suggestions: this.getSuggestions(value) })
  }

  onSuggestionsClearRequested = () => {
    this.setState({ suggestions: [] })
  }

  getSuggestions = value => {
    const inputValue = value.trim().toLowerCase()
    const inputLength = inputValue.length

    return inputLength === 0 ? [] : this.props.players.filter(player => {
      return player.toLowerCase().slice(0, inputLength) === inputValue
    })
  }

  getSuggestionValue = suggestion => suggestion

  renderSuggestion = suggestion => (<div>{suggestion}</div>)

  render () {
    const { value, suggestions } = this.state

    const inputProps = {
      value,
      onChange: this.onChange
    }

    return (
      <Autosuggest
        suggestions={suggestions}
        onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
        onSuggestionsClearRequested={this.onSuggestionsClearRequested}
        getSuggestionValue={this.getSuggestionValue}
        renderSuggestion={this.renderSuggestion}
        inputProps={inputProps}
      />
    )
  }
}
