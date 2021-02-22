import ls from 'local-storage'

const leagueKey = 'currentLeague'

const currentLeague = () => {
  return ls.get(leagueKey) || '14'
}

const setLeague = (league) => {
  ls.set(leagueKey, league)
}

const Leagues = [
  { id: 14, name: "2021 Session 3"},
  { id: 13, name: "2020/2021 Session 1" },
  { id: 12, name: "2019/2020 Session 2" },
  { id: 10, name: "2019/2020 Session 1" },
  { id: 9, name: "2018/2019 Session 2" },
  { id: 8, name: "2018/2019 Session 1" },
  { id: 7, name: "2017/2018 Session 2" },
  { id: 6, name: "2017/2018 Session 1" },
  { id: 5, name: "2016/2017 Session 2" },
  { id: 4, name: "2016/2017 Session 1" },
  { id: 3, name: "2015/2016 Winter" },
  { id: 2, name: "2014/2015 Winter", }
]

export {
  currentLeague,
  setLeague,
  Leagues
}
