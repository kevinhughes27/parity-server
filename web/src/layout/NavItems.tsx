import React from 'react'
import { NavLink } from 'react-router-dom'
import List from '@mui/material/List'
import Divider from '@mui/material/Divider'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'

function NavItems(props: {closeNav: () => void}) {
  const NavItem = (path: string, text: string) => (
    <NavLink to={path} style={{ color: 'black',  textDecoration: 'None' }} key={text} onClick={() => props.closeNav()}>
      <ListItem button>
        <ListItemText primary={text} />
      </ListItem>
    </NavLink>
  );

  const ExternalItem = (path: string, text: string) => (
    <a href={path} target='_blank' rel='noopener noreferrer' style={{ color: 'black', textDecoration: 'None' }} key={text}>
      <ListItem button>
        <ListItemText primary={text} />
      </ListItem>
    </a>
  );

  return (
    <List>
      <ListItem>
        <img src='/logo.png' style={{width: 240}} alt="logo"/>
      </ListItem>

      { NavItem('/games', "Games") }
      { NavItem('/', "Player Stats") }
      { NavItem('/leaderboards', "Leaderboards") }
      { NavItem('/compare_players', "Compare Players") }
      { NavItem('/team_dashboard', "Team Dashboard") }

      <Divider />

      { ExternalItem("https://github.com/kevinhughes27/parity-server", "Source Code") }
    </List>
  )
}

export default NavItems
