import React, { useState } from 'react';
import makeStyles from '@mui/styles/makeStyles';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Hidden from '@mui/material/Hidden';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import NavItems from './NavItems';

const useStyles = makeStyles((theme) => ({
  bar: {
    height: 64
  },
  title: {
    flex: 1,
    color: 'white',
    textAlign: 'center'
  },
  menuButton: {
    color: 'white',
    marginLeft: -12,
    marginRight: 20
  }
}));

function Layout(props: {children?: React.ReactNode}) {
  const classes = useStyles();
  const [sideNavOpen, setSideNavOpen] = useState(false);

  const TopBar = () => (
    <AppBar position="static" className={classes.bar}>
      <Toolbar>
        <IconButton
          id="side-bar"
          className={classes.menuButton}
          onClick={() => setSideNavOpen(true)}
          size="large">
          <MenuIcon />
        </IconButton>

        <Typography variant="h5" className={classes.title}>
          <Hidden mdDown >Parity 2.0 </Hidden>
        </Typography>

        {props.children ? props.children : null}
      </Toolbar>
    </AppBar>
  );

  const SideNav = () => (
    <SwipeableDrawer
        open={sideNavOpen}
        onOpen={() => setSideNavOpen(true)}
        onClose={() => setSideNavOpen(false)}
      >
      <NavItems closeNav={() => setSideNavOpen(false)}/>
    </SwipeableDrawer>
  );

  return (
    <>
      <TopBar />
      <SideNav />
    </>
  );
}

export default Layout;
