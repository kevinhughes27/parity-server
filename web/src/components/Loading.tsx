import React from 'react'
import CircularProgress from '@material-ui/core/CircularProgress';
import { makeStyles } from '@material-ui/core/styles'

const useStyles = makeStyles((theme) => ({
  container: {
    display: 'flex',
    height: '92vh',
    justifyContent: 'center',
    alignItems: 'center'
  },
  spinner: {
    marginBottom: 80
  }
}));

function Loading() {
  const classes = useStyles();

  return (
    <div className={classes.container}>
      <CircularProgress
        className={classes.spinner}
        color="secondary"
        size={70}
        thickness={2}
      />
    </div>
  );
}

export default Loading;
