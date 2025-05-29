import React from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';

const Roster = ({ players }: { players: string[] }) => (
  <Paper>
    <Table size="small">
      <TableBody>
        {players.map(player => {
          return (
            <TableRow key={player} hover>
              <TableCell>{player}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </Paper>
);

export default Roster;
