import React, { useState, ReactNode } from 'react';
import Layout from '../layout';
import Loading from '../components/Loading';
import LeaguePicker from '../components/LeaguePicker';
import { useLeague } from '../hooks/league';
import { fetchPlayers, fetchWeeks, Player } from '../api';

interface ISalaryPageComponentProps {
  weeks: number[];
  players: Player[];
}

function SalaryProvider(props: { component: (props: ISalaryPageComponentProps) => ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [weeks, setWeeks] = useState<number[]>([]);
  const [league] = useLeague();

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const players = await fetchPlayers(league);
      setPlayers(players);

      const weeks = await fetchWeeks(league);
      setWeeks(weeks);

      setLoading(false);
    };

    fetchData();
  }, [league]);

  const Main = () => {
    if (loading) return <Loading />;

    return (
      <div style={{ height: '100%', minHeight: '100%' }}>
        {props.component({ weeks: weeks, players: players })}
      </div>
    );
  };

  return (
    <div>
      <Layout>
        <LeaguePicker mobile={false} />
      </Layout>
      <Main />
    </div>
  );
}

export default SalaryProvider;
