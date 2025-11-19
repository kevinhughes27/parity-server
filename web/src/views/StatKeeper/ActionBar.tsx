import React from 'react';
import { Box, Button, Stack } from '@mui/material';

interface ActionBarProps {
  primaryActions: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    color?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    variant?: 'text' | 'outlined' | 'contained';
  }[];
  secondaryActions: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    color?: 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    variant?: 'text' | 'outlined' | 'contained';
  }[];
}

// The ActionBar needs to fit horizontally on the tablet screens.
// The screen size is: 800 x 1280, density 189
// use a device simulator to make sure it looks proper when making changes

const ActionBar: React.FC<ActionBarProps> = ({ primaryActions, secondaryActions }) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70px',
        p: '10px 15px',
        backgroundColor: 'white',
        borderTop: '1px solid #ccc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        zIndex: 100,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        flexWrap="nowrap"
        alignItems="center"
        sx={{ overflow: 'auto' }}
      >
        {primaryActions.map((action, index) => (
          <Button
            key={index}
            onClick={action.onClick}
            disabled={action.disabled}
            variant={action.variant || 'contained'}
            color={action.color || 'primary'}
            size="small"
            sx={{ minWidth: '90px', fontSize: '1.0rem', px: 2, py: 1, whiteSpace: 'nowrap' }}
          >
            {action.label}
          </Button>
        ))}
      </Stack>

      <Stack direction="row" spacing={0.5} alignItems="center">
        {secondaryActions.map((action, index) => (
          <Button
            key={index}
            onClick={action.onClick}
            disabled={action.disabled}
            variant={action.variant || 'outlined'}
            color={action.color || 'primary'}
            size="small"
            sx={{ minWidth: '90px', fontSize: '1.0rem', px: 2, py: 1, whiteSpace: 'nowrap' }}
          >
            {action.label}
          </Button>
        ))}
      </Stack>
    </Box>
  );
};

export default ActionBar;
