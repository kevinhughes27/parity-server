import React from 'react'
import Card from './Card'
import { Stats } from '../../api'

export default function Leaderboards(props: {stats: Stats}) {
  const stats = props.stats

  return (
    <div style={{display: 'flex', flexWrap: 'wrap'}}>
      <Card stat='pay' stats={stats} money={true} />
      <Card stat='salary_per_point' stats={stats} money={true} />
      <Card stat='goals' stats={stats} />
      <Card stat='assists' stats={stats} />
      <Card stat='second_assists' stats={stats} />
      <Card stat='callahan' stats={stats} />
      <Card stat='catches' stats={stats} />
      <Card stat='completions' stats={stats} />
      <Card stat='d_blocks' stats={stats} />
      <Card stat='throw_aways' stats={stats} />
    </div>
  )
}
