import React from 'react'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'

const Roster = ({players}: {players: string[]}) => (
  <Table size="small">
    <TableBody>
      { players.map((player) => {
        return (
          <TableRow key={player} hover>
            <TableCell>
              {player}
            </TableCell>
          </TableRow>
        )
      })}
    </TableBody>
  </Table>
)

export default Roster
