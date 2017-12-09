// @flow

import React, { Component } from 'react'
import ls from 'local-storage'

const storageKey = 'searchBar'

type Props = {
  changeFilter: any
}

export default class SearchBar extends Component {
  props: Props

  componentDidMount () {
    let query = ls.get(storageKey) || ''
    this.props.changeFilter(query)
  }

  searchChange (event: any) {
    let query = event.target.value
    ls.set(storageKey, query)
    this.props.changeFilter(query)
  }

  render () {
    let query = ls.get(storageKey) || ''
    let searchChange = this.searchChange.bind(this)

    return (
      <input type="text"
             name="search"
             value={query}
             placeholder="Search players or team ..."
             onChange={searchChange} />
    )
  }
}
