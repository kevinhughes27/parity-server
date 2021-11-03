import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import List from '@material-ui/core/List'
import Divider from '@material-ui/core/Divider'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import Collapse from '@material-ui/core/Collapse'
import ExpandLess from '@material-ui/icons/ExpandLess'
import ExpandMore from '@material-ui/icons/ExpandMore'

function NavItems(props: {closeNav: () => void}) {
  const [expanded, setExpanded] = useState(false);

  const forumUrl = 'https://www.ocua.ca/forum/33'
  const podcastUrl = 'https://soundcloud.com/user-640277634/sets/parity-podcast-season-5/s-1oSLUNq9qt4'
  const srcUrl = 'https://github.com/kevinhughes27/parity-server'
  const volunteerUrl = 'https://docs.google.com/spreadsheets/d/1RZvxyqteN-GZHntxqwonHlvnQxLUbAmZ-FafGn8oNws/edit'

  const spreadsheets = [
    { name: '2019-2020', url: 'https://docs.google.com/spreadsheets/d/12_SdWDIFQvCiNP3j4mlKZ19bXwmiLqXBJg_g_0K8UIw' },
    { name: '2018-2019', url: 'https://docs.google.com/spreadsheets/d/1KTFwydcZrVoHqEGej1uyZk8rO58RDr_1tUMIh08yZN8' },
    { name: '2017-2018', url: 'https://docs.google.com/spreadsheets/d/1F46H8ZRGP8Jzj1zSW0PT8HerBZ_BlHI5T48A2vp34r0' },
  ];

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

      { ExternalItem(volunteerUrl, "Volunteer") }
      { ExternalItem(forumUrl, "Forum") }
      { ExternalItem(podcastUrl, "Podcast") }

      <ListItem button onClick={() => setExpanded(!expanded)}>
        <ListItemText primary="Spreadsheets" />
        {expanded ? <ExpandLess /> : <ExpandMore />}
      </ListItem>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          { spreadsheets.map(sheet => ExternalItem(sheet.url, sheet.name)) }
        </List>
      </Collapse>

      { ExternalItem(srcUrl, "Source Code") }
    </List>
  )
}

export default NavItems
