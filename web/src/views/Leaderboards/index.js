import React, { Component } from 'react'
import Table from './Table'

export default class Leaderboards extends Component {
  render () {
    const stats = this.props.stats

    return (
      <div style={{display: 'flex', flexWrap: 'wrap'}}>
        <Table stat='pay' stats={stats} />
        <Table stat='salary_per_point' stats={stats} />
        <Table stat='goals' stats={stats} />
        <Table stat='assists' stats={stats} />
        <Table stat='catches' stats={stats} />
        <Table stat='completions' stats={stats} />
        <Table stat='d_blocks' stats={stats} />
        <Table stat='throw_aways' stats={stats} />
        <Table stat='drops' stats={stats} />
      </div>
    )
  }
}
