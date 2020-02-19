import React, { Component } from 'react'
import { NavLink } from 'react-router-dom'
import List from '@material-ui/core/List'
import Divider from '@material-ui/core/Divider'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import Collapse from '@material-ui/core/Collapse'
import ExpandLess from '@material-ui/icons/ExpandLess'
import ExpandMore from '@material-ui/icons/ExpandMore'

const NavItem = (path, text) => (
  <NavLink to={path} style={{ color: 'black',  textDecoration: 'None' }} key={text}>
    <ListItem button>
      <ListItemText primary={text} />
    </ListItem>
  </NavLink>
);

const ExternalItem = (path, text) => (
  <a href={path} target='_blank' rel='noopener noreferrer' style={{ color: 'black', textDecoration: 'None' }} key={text}>
    <ListItem button>
      <ListItemText primary={text} />
    </ListItem>
  </a>
);

class NavItems extends Component {
  state = {
    expanded: false
  };

  handleClick = () => {
    this.setState({expanded: !this.state.expanded})
  };

  render () {
    const forumUrl = 'https://www.ocua.ca/forum/33'
    const podcastUrl = 'https://soundcloud.com/user-640277634/sets/parity-podcast-season-4/s-KvCFa'
    const srcUrl = 'https://github.com/kevinhughes27/parity-server'
    const volunteerUrl = 'https://docs.google.com/spreadsheets/d/1ijmSykLC4LM0vfvnKyAqymp7wZRXWkAeejNvBgukOj0/edit'

    const spreadsheets = [
      { name: '2019-2020', url: 'https://docs.google.com/spreadsheets/d/12_SdWDIFQvCiNP3j4mlKZ19bXwmiLqXBJg_g_0K8UIw' },
      { name: '2018-2019', url: 'https://docs.google.com/spreadsheets/d/1KTFwydcZrVoHqEGej1uyZk8rO58RDr_1tUMIh08yZN8' },
      { name: '2017-2018', url: 'https://docs.google.com/spreadsheets/d/1F46H8ZRGP8Jzj1zSW0PT8HerBZ_BlHI5T48A2vp34r0' },
    ];

    return (
      <List>
        <ListItem>
          <img src='/logo.png' style={{width: 240}} alt="logo"/>
        </ListItem>

        { NavItem('/games', "Games") }
        { NavItem('/', "Player Stats") }
        { NavItem('/graphs', "Graphs") }
        { NavItem('/leaderboards', "Leaderboards") }
        { NavItem('/team_dashboard', "Team Dashboard") }

        <Divider />

        { ExternalItem(volunteerUrl, "Volunteer") }
        { ExternalItem(forumUrl, "Forum") }
        { ExternalItem(podcastUrl, "Podcast") }

        <ListItem button onClick={this.handleClick}>
          <ListItemText primary="Spreadsheets" />
          {this.state.expanded ? <ExpandLess /> : <ExpandMore />}
        </ListItem>

        <Collapse in={this.state.expanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            { spreadsheets.map(sheet => ExternalItem(sheet.url, sheet.name)) }
          </List>
        </Collapse>

        { ExternalItem(srcUrl, "Source Code") }
      </List>
    )
  }
}

export default NavItems
