import React from 'react'
import CircularProgress from '@mui/material/CircularProgress';
import makeStyles from '@mui/styles/makeStyles';

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
