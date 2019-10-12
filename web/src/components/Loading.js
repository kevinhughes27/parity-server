import React, { Component } from 'react'
import CircularProgress from '@material-ui/core/CircularProgress';
import { withStyles } from '@material-ui/core/styles';

const styles = {
  container: {
    display: 'flex',
    height: '92vh',
    justifyContent: 'center',
    alignItems: 'center'
  },
  spinner: {
    marginBottom: 80
  }
};

class Loading extends Component {
  render() {
    const { classes } = this.props;

    return (
      <div className={classes.container}>
        <CircularProgress
          className={classes.spinner}
          color="primary"
          size={70}
          thickness={2}
        />
      </div>
    );
  }
}

export default withStyles(styles)(Loading);
