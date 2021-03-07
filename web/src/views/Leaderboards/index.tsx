import React from 'react'
import Card from './Card'
import { useLeague } from '../../hooks/league'
import { useStats } from '../../hooks/stats'


export default function Leaderboards() {
  const [league] = useLeague();
  const [data, loading] = useStats(league);

  if (loading) {
    return null
  }

  const stats = data.stats

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
