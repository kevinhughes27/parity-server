import React from 'react';
import { Box, Typography } from '@mui/material';

const Version: React.FC = () => {
  const version = import.meta.env.VITE_GIT_HASH || 'dev';

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: 'text.disabled',
          fontSize: '0.8rem',
          opacity: 0.5,
        }}
      >
        version: {version}
      </Typography>
    </Box>
  );
};

export default Version;
