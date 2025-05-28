import React from 'react';
import Layout from '../layout';
import Loading from '../components/Loading';
import StatsFilters from '../components/StatsFilters';
import { useLeague } from '../hooks/league';
import { useStats } from '../hooks/stats';
import { Stats } from '../api';

interface IStatsPageComponentProps {
  week: number;
  stats: Stats;
}

function StatsPage(props: { component: React.FunctionComponent<IStatsPageComponentProps> }) {
  const [league] = useLeague();
  const [data, loading, changeWeek] = useStats(league);

  const Main = () => {
    if (loading) return <Loading />;

    return (
      <div style={{ height: '100%', minHeight: '100%' }}>
        {props.component({ week: data.week, stats: data.stats })}
      </div>
    );
  };

  return (
    <React.Fragment>
      <Layout>
        <StatsFilters data={data} changeWeek={changeWeek} />
      </Layout>
      <Main />
    </React.Fragment>
  );
}

export default StatsPage;
