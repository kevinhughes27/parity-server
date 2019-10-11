import * as React from 'react';
import SwipeableDrawer from '@material-ui/core/SwipeableDrawer';
import NavItems from './NavItems';

class SideNav extends React.Component {
  render() {
    return (
      <SwipeableDrawer
        open={this.props.open}
        onClose={this.props.handleClose}
        onOpen={this.props.handleOpen}
      >
        <NavItems />
      </SwipeableDrawer>
    );
  }
}

export default SideNav;
