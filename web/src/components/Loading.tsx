import React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';

const Container = styled(Box)({
  display: 'flex',
  height: '92vh',
  justifyContent: 'center',
  alignItems: 'center',
});

const Spinner = styled(CircularProgress)({
  marginBottom: 80,
});

function Loading() {
  return (
    <Container>
      <Spinner color="secondary" size={70} thickness={2} />
    </Container>
  );
}

export default Loading;
