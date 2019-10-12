import React, { Component } from 'react'
import Autosuggest from 'react-autosuggest'
import match from 'autosuggest-highlight/match'
import parse from 'autosuggest-highlight/parse'
import TextField from '@material-ui/core/TextField'
import Paper from '@material-ui/core/Paper'
import MenuItem from '@material-ui/core/MenuItem'
import { withStyles } from '@material-ui/core/styles'

const styles = {
  root: {
    height: 250,
    flexGrow: 1,
  },
  container: {
    position: 'relative',
  },
  suggestionsContainerOpen: {
    position: 'absolute',
    zIndex: 1,
    marginTop: 10,
    left: 0,
    right: 0,
  },
  suggestion: {
    display: 'block',
  },
  suggestionsList: {
    margin: 0,
    padding: 0,
    listStyleType: 'none',
  },
  divider: {
    height: 10,
  }
}

class PlayerSelect extends Component {
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

  renderInputComponent(inputProps) {
    const { classes, inputRef = () => {}, ref, ...other } = inputProps;

    return (
      <TextField
        fullWidth
        InputProps={{
          inputRef: node => {
            ref(node);
            inputRef(node);
          },
          classes: {
            input: classes.input,
          }
        }}
        {...other}
      />
    );
  }

  renderSuggestion(suggestion, { query, isHighlighted }) {
    const matches = match(suggestion, query);
    const parts = parse(suggestion, matches);

    return (
      <MenuItem selected={isHighlighted} component="div">
        <div>
          {parts.map(part => (
            <span key={part.text} style={{ fontWeight: part.highlight ? 500 : 400 }}>
              {part.text}
            </span>
          ))}
        </div>
      </MenuItem>
    );
  }

  render () {
    const { classes } = this.props
    const { value, suggestions } = this.state

    const autosuggestProps = {
      suggestions,
      onSuggestionsFetchRequested: this.onSuggestionsFetchRequested,
      onSuggestionsClearRequested: this.onSuggestionsClearRequested,
      getSuggestionValue: this.getSuggestionValue,
      renderSuggestion: this.renderSuggestion,
      renderInputComponent: this.renderInputComponent,
    };

    return (
      <Autosuggest
        {...autosuggestProps}
        inputProps={{
          classes,
          value,
          onChange: this.onChange,
          onClick: this.onClick
        }}
        theme={{
          container: classes.container,
          suggestionsContainerOpen: classes.suggestionsContainerOpen,
          suggestionsList: classes.suggestionsList,
          suggestion: classes.suggestion,
        }}
        shouldRenderSuggestions={() => true}
        renderSuggestionsContainer={options => (
          <Paper {...options.containerProps} square>
            {options.children}
          </Paper>
        )}
      />
    )
  }
}

export default  withStyles(styles)(PlayerSelect)
