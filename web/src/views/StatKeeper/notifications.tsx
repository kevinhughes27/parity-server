import React, { useState, useCallback } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

interface UseSnackbarOptions {
  defaultSeverity?: AlertColor;
  autoHideDuration?: number;
  anchorOrigin?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
}

export function useSnackbar(options: UseSnackbarOptions = {}) {
  const {
    defaultSeverity = 'warning',
    autoHideDuration = 3000,
    anchorOrigin = { vertical: 'bottom', horizontal: 'center' },
  } = options;

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: defaultSeverity,
  });

  const showSnackbar = useCallback(
    (message: string, severity: AlertColor = defaultSeverity) => {
      setSnackbar({ open: true, message, severity });
    },
    [defaultSeverity]
  );

  const handleClose = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const SnackbarComponent = (
    <Snackbar
      open={snackbar.open}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={anchorOrigin}
    >
      <Alert
        onClose={handleClose}
        severity={snackbar.severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  );

  return { showSnackbar, SnackbarComponent };
}
