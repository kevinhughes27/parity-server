import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import NavItems from './NavItems';

const StyledAppBar = styled(AppBar)({
  height: 64
});

const StyledTypography = styled(Typography)({
  flex: 1,
  color: 'white',
  textAlign: 'center'
});

const StyledIconButton = styled(IconButton)({
  color: 'white',
  marginLeft: -12,
  marginRight: 20
});

function Layout(props: {children?: React.ReactNode}) {
  const [sideNavOpen, setSideNavOpen] = useState(false);

  const TopBar = () => (
    <StyledAppBar position="static">
      <Toolbar>
        <StyledIconButton
          id="side-bar"
          onClick={() => setSideNavOpen(true)}
          size="large">
          <MenuIcon />
        </StyledIconButton>

        <StyledTypography variant="h5" sx={{ display: { xs: 'none', lg: 'block' } }}>
          Parity 2.0
        </StyledTypography>

        {props.children ? props.children : null}
      </Toolbar>
    </StyledAppBar>
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
