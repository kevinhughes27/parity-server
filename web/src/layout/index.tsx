import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import Hidden from '@material-ui/core/Hidden';
import SwipeableDrawer from '@material-ui/core/SwipeableDrawer';
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
        >
          <MenuIcon />
        </IconButton>

        <Typography variant="h5" className={classes.title}>
          <Hidden smDown >Parity 2.0 </Hidden>
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
