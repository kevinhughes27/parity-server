import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../layout/';
import Loading from '../../components/Loading';
import Editor from './Editor';
import { fetchGame, Game } from '../../api';

export default function GameEdit() {
  const params = useParams();

  const leagueId = params.leagueId as string;
  const gameId = params.gameId as string;

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<Game | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const game = await fetchGame(gameId, leagueId);
      setGame(game);
      setLoading(false);
    };

    fetchData();
  }, [leagueId, gameId]);

  const Main = () => {
    if (loading || game == null) return <Loading />;

    return <Editor gameId={gameId} leagueId={leagueId} game={game} />;
  };

  return (
    <React.Fragment>
      <Layout />
      <Main />
    </React.Fragment>
  );
}
