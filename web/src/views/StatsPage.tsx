import React from 'react'
import Layout from '../layout'
import Loading from '../components/Loading'
import StatsFilters from '../components/StatsFilters'
import { useLeague } from '../hooks/league'
import { useStats } from '../hooks/stats'

const StatsPage: React.FunctionComponent<{}> = ({ children }) => {
  const [league] = useLeague();
  const [_data, loading] = useStats(league);

  const Main = () => {
    if (loading) return <Loading />;

    return (
      <div style={{height: '100%', minHeight: '100%'}}>
        { children }
      </div>
    );
  }

  return (
    <React.Fragment>
      <Layout>
        <StatsFilters />
      </Layout>
      <Main />
    </React.Fragment>
  );
}

export default StatsPage
