import React from 'react'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableRow from '@material-ui/core/TableRow'

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
