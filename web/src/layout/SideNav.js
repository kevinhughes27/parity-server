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
        <div
          tabIndex={0}
          role="button"
          onClick={this.props.handleClose}
          onKeyDown={this.props.handleClose}
        >
          <NavItems />
        </div>
      </SwipeableDrawer>
    );
  }
}

export default SideNav;
