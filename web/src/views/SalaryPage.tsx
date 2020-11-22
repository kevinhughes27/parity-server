import React, { useState } from 'react'
import Layout from '../layout'
import Loading from '../components/Loading'
import LeaguePicker from '../components/LeaguePicker'
import { useLeague } from '../hooks/league'
import { fetchPlayers, Player } from "../api"

interface ISalaryPageComponentProps {
  players: Player[];
}

function SalaryProvider(props: {component: React.FunctionComponent<ISalaryPageComponentProps>}) {
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState<Player[]>([])
  const [league] = useLeague()

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const players = await fetchPlayers(league)
      setPlayers(players)
      setLoading(false)
    }

    fetchData()
  }, [league])

  const Main = () => {
    if (loading) return (<Loading />)

    return (
      <div style={{height: '100%', minHeight: '100%'}}>
        { props.component({players: players}) }
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
