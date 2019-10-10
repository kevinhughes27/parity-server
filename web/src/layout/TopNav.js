import * as React from 'react';
import { TopNav as styles } from '../styles';
import { withStyles } from '@material-ui/styles';
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
    const { classes } = this.props;

    return (
      <>
        <AppBar position="static" className={classes.bar}>
          <Toolbar>
            <IconButton
              id="side-bar"
              className={classes.menuButton}
              onClick={this.openNav}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h5" className={classes.title}>
              Parity 2.0
            </Typography>
            {this.props.children}
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

export default withStyles(styles)(TopNav);
