import React, { useState } from 'react';
import { Box, IconButton, Menu, MenuItem, Divider } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { Bookkeeper } from './bookkeeper';
import { useSnackbar } from './notifications';

interface ActionsMenuProps {
  bookkeeper: Bookkeeper;
  currentView: string;
  isSubmitting: boolean;
  onRecordHalf: () => Promise<void>;
  onSubmitGame: () => Promise<void>;
  onChangeLine: () => void;
  onEditRosters: () => void;
}

const ActionsMenu: React.FC<ActionsMenuProps> = ({
  bookkeeper,
  currentView,
  isSubmitting,
  onRecordHalf,
  onSubmitGame,
  onChangeLine,
  onEditRosters,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { showSnackbar, SnackbarComponent } = useSnackbar({ defaultSeverity: 'info' });
  const open = Boolean(anchorEl);

  const gameStatus = bookkeeper.getGameStatus();
  const hasActivePoint = bookkeeper.activePoint !== null;
  const pointsCount = bookkeeper.pointsCount;

  // Define all disabled states as constants
  const isInLineSelectionView = currentView === 'selectLines';

  const canChangeLine = !isInLineSelectionView && currentView !== 'editRosters';
  const canEditRosters = currentView !== 'editRosters';

  const isHalfRecorded = bookkeeper.pointsAtHalf > 0;
  const canRecordHalf = !isHalfRecorded && !hasActivePoint && pointsCount > 0;

  const canSubmitGame =
    gameStatus !== 'submitted' && gameStatus !== 'uploaded' && !isSubmitting && pointsCount > 0;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAction = async (action: () => Promise<void> | void) => {
    await action();
    handleClose();
  };

  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else {
        showSnackbar('Fullscreen not supported on this device', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to enter fullscreen', 'error');
      console.error('Fullscreen error:', error);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        showSnackbar('Exit Fullscreen', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to exit fullscreen', 'error');
      console.error('Fullscreen error:', error);
    }
  };

  return (
    <>
      <Box>
        <IconButton onClick={handleClick} size="large" sx={{ border: '1px solid #ccc' }}>
          <MenuIcon />
        </IconButton>

        <Menu id="game-actions-menu" anchorEl={anchorEl} open={open} onClose={handleClose}>
          <MenuItem
            onClick={() => handleAction(onChangeLine)}
            disabled={!canChangeLine}
            sx={{ color: !canChangeLine ? '#999' : 'inherit' }}
          >
            🔄 Change Line
          </MenuItem>

          <MenuItem
            onClick={() => handleAction(onEditRosters)}
            disabled={!canEditRosters}
            sx={{ color: !canEditRosters ? '#999' : 'inherit' }}
          >
            📝 Edit Rosters
          </MenuItem>

          <Divider />

          <MenuItem onClick={() => handleAction(enterFullscreen)}>
            <FullscreenIcon sx={{ mr: 1, fontSize: '1.2em' }} />
            Enter Fullscreen
          </MenuItem>

          <MenuItem onClick={() => handleAction(exitFullscreen)}>
            <FullscreenExitIcon sx={{ mr: 1, fontSize: '1.2em' }} />
            Exit Fullscreen
          </MenuItem>

          <Divider />

          <MenuItem
            onClick={() => handleAction(onRecordHalf)}
            disabled={!canRecordHalf}
            sx={{ color: !canRecordHalf ? '#999' : 'inherit' }}
          >
            ⏸️ Record Half
          </MenuItem>

          <MenuItem
            onClick={() => handleAction(onSubmitGame)}
            disabled={!canSubmitGame}
            sx={{ color: !canSubmitGame ? '#999' : 'inherit' }}
          >
            {isSubmitting ? '⏳ Submitting...' : '✅ Submit Game'}
          </MenuItem>
        </Menu>
      </Box>
      {SnackbarComponent}
    </>
  );
};

export default ActionsMenu;
