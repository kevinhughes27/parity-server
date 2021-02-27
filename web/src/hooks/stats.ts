import React, { useState } from 'react'
import { fetchWeeks, fetchStats, Stats } from "../api"
import { last } from 'lodash'

interface StatsData {
  weeks: number[];
  week: number;
  stats: Stats;
}

type UseStats = [
  data: StatsData,
  isLoading: boolean,
  changeWeek: (week: number) => void
]

export const useStats = (leagueId: string): UseStats => {
  const emptyState = {weeks: [], week: 0, stats: {}}
  const [data, setData] = useState<StatsData>(emptyState);
  const [isLoading, setLoading] = useState(true)

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      const weeks = await fetchWeeks(leagueId)
      const week = (last(weeks) || 0) as number
      const stats = await fetchStats(week, leagueId)

      setData({
        weeks: weeks,
        week: week,
        stats: stats
      })

      setLoading(false)
    }

    fetchData();
  }, [leagueId]);

  const changeWeek = (week: number) => {
    const fetchData = async () => {
      setLoading(true)

      const stats = await fetchStats(week, leagueId)

      setData({
        weeks: data.weeks,
        week: week,
        stats: stats
      });

      setLoading(false)
    };

    fetchData()
  }

  return [data, isLoading, changeWeek]
}
