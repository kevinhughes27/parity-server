import React, { useState } from 'react';
import { useParams } from 'react-router';
import Layout from '../../layout/';
import Loading from '../../components/Loading';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import { Typography } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { styled } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import Paper from '@mui/material/Paper';

import Team from './Team';
import Points from './Points';
import { fetchGame } from '../../api';
import type { Game } from '../../api';
import { homeColors, awayColors } from '../../helpers';
import { pickBy, includes, forIn } from 'lodash';

interface StatMaxes {
  [key: string]: number;
}

const TeamName = styled(Typography)({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
});

export default function GameShow() {
  const params = useParams<{ leagueId: string; gameId: string }>();
  const leagueId = params.leagueId;
  const gameId = params.gameId;

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<Game | null>(null);

  React.useEffect(() => {
    if (!leagueId || !gameId) return;
    const fetchData = async () => {
      setLoading(true);
      const game = await fetchGame(gameId, leagueId);
      setGame(game);
      setLoading(false);
    };
    fetchData();
  }, [leagueId, gameId]);

  if (!leagueId || !gameId) {
    return <div>Invalid game parameters</div>;
  }

  const Main = () => {
    if (loading || game == null) return <Loading />;

    const homeWon = game.homeScore > game.awayScore;
    const homeJsx = homeWon ? (
      <span>
        <StarIcon fontSize="small" /> {game.homeTeam}
      </span>
    ) : (
      <span>{game.homeTeam}</span>
    );

    const awayWon = game.awayScore > game.homeScore;
    const awayJsx = awayWon ? (
      <span>
        <StarIcon fontSize="small" /> {game.awayTeam}
      </span>
    ) : (
      <span>{game.awayTeam}</span>
    );

    const homeStats = pickBy(game.stats, (_stat, player) => includes(game.homeRoster, player));
    const awayStats = pickBy(game.stats, (_stat, player) => includes(game.awayRoster, player));

    const statMaxes: StatMaxes = {};
    forIn(game.stats, stats => {
      forIn(stats, (value, key) => {
        const max = Math.max(value as number, statMaxes[key] || 0);
        statMaxes[key] = max;
      });
    });

    return (
      <Container style={{ marginTop: 20 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Team
              teamName={homeJsx}
              score={game.homeScore}
              players={game.homeRoster}
              points={game.points}
              stats={homeStats}
              colors={homeColors}
              statMaxes={statMaxes}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Team
              teamName={awayJsx}
              score={game.awayScore}
              players={game.awayRoster}
              points={game.points}
              stats={awayStats}
              colors={awayColors}
              statMaxes={statMaxes}
            />
          </Grid>
        </Grid>
        <Points game={game} />
      </Container>
    );
  };

  return (
    <React.Fragment>
      <Layout />
      <Main />
    </React.Fragment>
  );
}

const StyledPaper = styled(Paper)({
  padding: 16,
  marginBottom: 16,
});

interface GameProps {
  game: Game;
}

function Game({ game }: GameProps) {
  return (
    <StyledPaper>
      <Grid container spacing={2}>
        <Grid size={12}>
          <Link to={`/game/${game.id}`}>
            <Typography variant="h6">
              {game.homeTeam} vs {game.awayTeam}
            </Typography>
          </Link>
        </Grid>
        <Grid size={12}>
          <Grid container spacing={2}>
            <Grid size={6}>
              <TeamName>
                {game.homeTeam}
                {game.homeScore > game.awayScore && <StarIcon fontSize="small" />}
              </TeamName>
            </Grid>
            <Grid size={6}>
              <TeamName>
                {game.awayTeam}
                {game.awayScore > game.homeScore && <StarIcon fontSize="small" />}
              </TeamName>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </StyledPaper>
  );
}
