import React, { useState } from 'react'
import { fetchWeeks, fetchStats } from "../api"
import { last } from 'lodash'

export const useStats = (league) => {
  const [data, setData] = useState({weeks: [], week: 0, stats: {}});
  const [isLoading, setLoading] = useState(true)

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      const weeks = await fetchWeeks(league)
      const week = last(weeks) || 0
      const stats = await fetchStats(week, league)

      setData({
        weeks: weeks,
        week: week,
        stats: stats
      })

      setLoading(false)
    }

    fetchData();
  }, [league]);

  const changeWeek = (week) => {
    const fetchData = async () => {
      setLoading(true)

      const stats = await fetchStats(week, league)

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
