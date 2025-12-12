import React, { useState } from 'react';
import { Box, IconButton, Menu, MenuItem, Divider } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import { GameState } from './bookkeeper';
import { StoredGame } from './db';

interface ActionsMenuProps {
  numericGameId: number | undefined;
  gameStatus: StoredGame['status'] | undefined;
  isHalfRecorded: boolean;
  isSubmitting: boolean;
  currentGameState: GameState;
  isEditingRosters: boolean;
  hasActivePoint: boolean;
  pointsCount: number;
  onRecordHalf: () => Promise<void>;
  onSubmitGame: () => Promise<void>;
  onChangeLine: () => void;
  onEditRosters: () => void;
  onEnterFullscreen: () => void;
}

const ActionsMenu: React.FC<ActionsMenuProps> = ({
  numericGameId,
  gameStatus,
  isHalfRecorded,
  isSubmitting,
  currentGameState,
  isEditingRosters,
  hasActivePoint,
  pointsCount,
  onRecordHalf,
  onSubmitGame,
  onChangeLine,
  onEditRosters,
  onEnterFullscreen,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Define all disabled states as constants
  const isSelectingOrEditingLines =
    currentGameState === GameState.SelectingLines || currentGameState === GameState.EditingLines;

  const canChangeLine = !isSelectingOrEditingLines && !isEditingRosters;

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

  if (!numericGameId) return null;

  return (
    <Box>
      <IconButton onClick={handleClick} size="medium" sx={{ border: '1px solid #ccc' }}>
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

        <MenuItem onClick={() => handleAction(onEditRosters)}>📝 Edit Rosters</MenuItem>

        <Divider />

        <MenuItem onClick={() => handleAction(onEnterFullscreen)}>
          <FullscreenIcon sx={{ mr: 1, fontSize: '1.2em' }} />
          Enter Fullscreen
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
  );
};

export default ActionsMenu;
