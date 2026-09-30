import React, { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

interface ConfirmOptions {
  title?: string;
  message?: string;
  content?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'error' | 'success' | 'warning' | 'info';
}

interface DialogState {
  open: boolean;
  options: ConfirmOptions;
}

export function useConfirmDialog() {
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    options: {},
  });

  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback(
    (messageOrOptions: string | ConfirmOptions, options?: ConfirmOptions): Promise<boolean> => {
      return new Promise(resolve => {
        resolveRef.current = resolve;

        // Handle both string message and options object
        const dialogOptions: ConfirmOptions =
          typeof messageOrOptions === 'string'
            ? { message: messageOrOptions, ...options }
            : messageOrOptions;

        setDialog({
          open: true,
          options: {
            title: 'Confirm',
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            confirmColor: 'primary',
            ...dialogOptions,
          },
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    setDialog(prev => ({ ...prev, open: false }));
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setDialog(prev => ({ ...prev, open: false }));
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  }, []);

  const DialogComponent = (
    <Dialog
      open={dialog.open}
      onClose={handleCancel}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      {dialog.options.title && (
        <DialogTitle id="confirm-dialog-title">{dialog.options.title}</DialogTitle>
      )}
      <DialogContent>
        {dialog.options.content ? (
          dialog.options.content
        ) : dialog.options.message ? (
          <DialogContentText id="confirm-dialog-description" sx={{ whiteSpace: 'pre-line' }}>
            {dialog.options.message}
          </DialogContentText>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="primary">
          {dialog.options.cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          color={dialog.options.confirmColor}
          variant="contained"
          autoFocus
        >
          {dialog.options.confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { confirm, DialogComponent };
}
