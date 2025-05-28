import React from 'react'
import { NavLink } from 'react-router-dom'
import List from '@mui/material/List'
import Divider from '@mui/material/Divider'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import { styled } from '@mui/material/styles'

const StyledNavLink = styled(NavLink)({
  color: 'black',
  textDecoration: 'none'
});

const StyledAnchor = styled('a')({
  color: 'black',
  textDecoration: 'none'
});

function NavItems(props: {closeNav: () => void}) {
  const NavItem = (path: string, text: string) => (
    <StyledNavLink to={path} key={text} onClick={() => props.closeNav()}>
      <ListItemButton>
        <ListItemText primary={text} />
      </ListItemButton>
    </StyledNavLink>
  );

  const ExternalItem = (path: string, text: string) => (
    <StyledAnchor href={path} target='_blank' rel='noopener noreferrer' key={text}>
      <ListItemButton>
        <ListItemText primary={text} />
      </ListItemButton>
    </StyledAnchor>
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
      { ExternalItem("/docs", "API Docs") }
    </List>
  )
}

export default NavItems
