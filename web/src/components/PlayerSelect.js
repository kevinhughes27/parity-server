import React, { Component } from 'react'
import Autosuggest from 'react-autosuggest'

export default class PlayerSelect extends Component {
  constructor (props) {
    super(props)

    this.state = {
      value: this.props.value,
      suggestions: this.props.players
    }
  }

  onChange = (event, suggestion) => {
    let newValue = suggestion.newValue
    this.setState({ value: newValue })
    this.props.onChange(newValue)
  }

  onClick = () => {
    this.setState({
      value: '',
      suggestions: this.props.players
    })
  }

  onSuggestionsFetchRequested = (event) => {
    this.setState({ suggestions: this.getSuggestions(event.value) })
  }

  onSuggestionsClearRequested = () => {
    this.setState({ suggestions: [] })
  }

  getSuggestions = (value) => {
    const inputValue = value.trim().toLowerCase()
    const inputLength = inputValue.length
    const players = this.props.players

    return inputLength === 0 ? players : players.filter(player => {
      return player.toLowerCase().slice(0, inputLength) === inputValue
    })
  }

  getSuggestionValue = (suggestion) => suggestion

  renderSuggestion = (suggestion) => (<div>{suggestion}</div>)

  render () {
    const { value, suggestions } = this.state

    const inputProps = {
      value,
      onChange: this.onChange,
      onClick: this.onClick
    }

    return (
      <Autosuggest
        suggestions={suggestions}
        onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
        onSuggestionsClearRequested={this.onSuggestionsClearRequested}
        getSuggestionValue={this.getSuggestionValue}
        shouldRenderSuggestions={() => true}
        renderSuggestion={this.renderSuggestion}
        inputProps={inputProps}
      />
    )
  }
}
