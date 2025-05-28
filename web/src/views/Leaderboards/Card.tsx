import React from 'react';
import { styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import capitalize from 'capitalize';
import format from 'format-number';
import { map, keys, sortBy, sum } from 'lodash';
import { Stats } from '../../api';

const StyledPaper = styled(Paper)({
  minWidth: 300,
  margin: 20
});

const StyledTypography = styled(Typography)({
  paddingLeft: 15,
  paddingTop: 10
});

interface PlayerStat {
  name: string;
  value: number;
}

function topPlayers(stats: Stats, stat: string, num: number): PlayerStat[] {
  const players = keys(stats).map(name => ({
    name,
    value: stats[name][stat] as number
  }));
  return sortBy(players, (player) => -player.value).slice(0, num);
}

function hasNonZeroValues(stats: Stats, stat: string): boolean {
  const values = keys(stats).map(name => stats[name][stat] as number);
  return sum(values) > 0;
}

interface CardProps {
  stat: string;
  stats: Stats;
  money?: boolean;
  num?: number;
}

function Card({ stat, stats, money = false, num = 10 }: CardProps): JSX.Element | null {
  // Don't render if all values are zero
  if (!hasNonZeroValues(stats, stat)) {
    return null;
  }

  const players = topPlayers(stats, stat, num);
  const formatter = money ? format({ prefix: '$' }) : (val: number) => val.toString();

  const title = capitalize(stat.replace(/_/g, ' '));

  return (
    <StyledPaper>
      <StyledTypography variant="h6">
        {title}
      </StyledTypography>
      <Table size="small">
        <TableBody>
          {map(players, (player) => (
            <TableRow key={player.name} hover>
              <TableCell>{player.name}</TableCell>
              <TableCell align="right">{formatter(player.value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </StyledPaper>
  );
}

export default Card;
