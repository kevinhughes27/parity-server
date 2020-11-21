import React, { useState } from 'react'
import Layout from '../layout'
import Loading from '../components/Loading'
import LeaguePicker from '../components/LeaguePicker'
import { useLeague } from '../hooks/league'
import { fetchPlayers } from "../api"

function SalaryProvider(props) {
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState([])
  const [league] = useLeague()

  React.useEffect(async () => {
    setLoading(true)
    const players = await fetchPlayers(league)
    setPlayers(players)
    setLoading(false)
  }, [league])

  const Main = () => {
    if (loading) return (<Loading />)

    return (
      <div style={{height: '100%', minHeight: '100%'}}>
        { React.cloneElement(props.children, {players: players}) }
      </div>
    );
  }

  return (
    <div>
      <Layout>
        <LeaguePicker />
      </Layout>
      <Main />
    </div>
  )
}

export default SalaryProvider
