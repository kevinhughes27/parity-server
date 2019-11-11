import React, { Component } from 'react'
import Card from './Card'

export default class Leaderboards extends Component {
  render () {
    const stats = this.props.stats

    return (
      <div style={{display: 'flex', flexWrap: 'wrap'}}>
        <Card stat='pay' stats={stats} money={true} />
        <Card stat='salary_per_point' stats={stats} money={true} />
        <Card stat='goals' stats={stats} />
        <Card stat='assists' stats={stats} />
        <Card stat='catches' stats={stats} />
        <Card stat='completions' stats={stats} />
        <Card stat='d_blocks' stats={stats} />
        <Card stat='throw_aways' stats={stats} />
        <Card stat='drops' stats={stats} />
      </div>
    )
  }
}
