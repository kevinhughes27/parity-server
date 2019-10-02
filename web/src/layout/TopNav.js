import * as React from 'react';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import SideNav from './SideNav';

class TopNav extends React.Component {
  state = {
    navOpen: false
  };

  openNav = () => {
    this.setState({ navOpen: true });
  };

  closeNave = () => {
    this.setState({ navOpen: false });
  };

  render() {
    return (
      <>
        <AppBar position="static">
          <Toolbar>
            <IconButton
              id="side-bar"
              onClick={this.props.openNav}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6">
              Parity 2.0
            </Typography>
            <div>
              {this.props.children}
            </div>
          </Toolbar>
        </AppBar>
        <SideNav
          open={this.state.navOpen}
          handleOpen={this.openNav}
          handleClose={this.closeNave}
        />
      </>
    );
  }
}

export default TopNav;
