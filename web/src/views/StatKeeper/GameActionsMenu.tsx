import React, { useState } from 'react';
import { StoredGame } from './db';
import { Box, IconButton, Menu, MenuItem, Divider } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

interface GameActionsMenuProps {
  numericGameId: number | undefined;
  gameStatus: StoredGame['status'] | undefined;
  isHalfRecorded: boolean;
  onRecordHalf: () => Promise<void>;
  onSubmitGame: () => Promise<void>;
  onChangeLine: () => void;
  onEditRosters: () => void;
}

const GameActionsMenu: React.FC<GameActionsMenuProps> = ({
  numericGameId,
  gameStatus,
  isHalfRecorded,
  onRecordHalf,
  onSubmitGame,
  onChangeLine,
  onEditRosters,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const canSubmitGame = gameStatus !== 'submitted' && gameStatus !== 'uploaded';

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
        <MenuItem onClick={() => handleAction(onEditRosters)}>Edit Rosters</MenuItem>

        <MenuItem onClick={() => handleAction(onChangeLine)}>Change Line</MenuItem>

        <Divider />

        <MenuItem
          onClick={() => handleAction(onRecordHalf)}
          disabled={isHalfRecorded}
          sx={{ color: isHalfRecorded ? '#999' : 'inherit' }}
        >
          Record Half
        </MenuItem>

        <MenuItem
          onClick={() => handleAction(onSubmitGame)}
          disabled={!canSubmitGame}
          sx={{ color: !canSubmitGame ? '#999' : 'inherit' }}
        >
          Submit Game
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default GameActionsMenu;
