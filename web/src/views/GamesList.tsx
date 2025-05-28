import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import Layout from '../layout/';
import Loading from '../components/Loading';
import LeaguePicker from '../components/LeaguePicker';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import { styled } from '@mui/material/styles';
import { groupBy } from 'lodash';
import { useLeague } from '../hooks/league';
import { fetchGames, Game } from '../api';

const StyledList = styled(List)({
  maxWidth: 800,
  margin: 'auto',
});

const StyledNavLink = styled(NavLink)({
  color: '#26a69a',
  textDecoration: 'none',
});

function GamesList() {
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<Game[]>([]);
  const [league] = useLeague();

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const games = await fetchGames(league);
      setGames(games);
      setLoading(false);
    };

    fetchData();
  }, [league]);

  const renderGames = (games: Game[]) => {
    const gamesByWeek = groupBy(games, game => game.week);
    const weeksInOrder = Object.keys(gamesByWeek).reverse();

    return (
      <React.Fragment>
        {weeksInOrder.map(week => {
          const games = gamesByWeek[week];
          return renderGameGroup(week, games);
        })}
      </React.Fragment>
    );
  };

  const renderGameGroup = (week: string, games: Game[]) => {
    return (
      <React.Fragment key={week}>
        <ListItem divider>
          <ListItemText>Week {week}</ListItemText>
        </ListItem>
        {games.map(renderGame)}
      </React.Fragment>
    );
  };

  const renderGame = (game: Game) => {
    return (
      <StyledNavLink key={game.id} to={`/${game.league_id}/games/${game.id}`}>
        <ListItemButton divider>
          <ListItemText style={{ paddingRight: 60 }}>
            {game.homeTeam} vs {game.awayTeam}
            <ListItemSecondaryAction>
              {game.homeScore} - {game.awayScore}
            </ListItemSecondaryAction>
          </ListItemText>
        </ListItemButton>
      </StyledNavLink>
    );
  };

  const renderMain = () => {
    if (loading) return <Loading />;

    return <StyledList>{renderGames(games)}</StyledList>;
  };

  return (
    <React.Fragment>
      <Layout>
        <LeaguePicker mobile={false} />
      </Layout>
      {renderMain()}
    </React.Fragment>
  );
}

export default GamesList;
