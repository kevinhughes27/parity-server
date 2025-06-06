import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { StoredGame } from './db'; // For gameStatus type
import { 
  Box, 
  IconButton, 
  Menu, 
  MenuItem, 
  Tooltip, 
  Divider 
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

interface GameActionsMenuProps {
  numericGameId: number | undefined;
  gameStatus: StoredGame['status'] | undefined;
  isHalfRecorded: boolean;
  onRecordHalf: () => Promise<void>;
  onSubmitGame: () => Promise<void>;
  onChangeLine: () => void;
  showChangeLineOption: boolean;
}

const GameActionsMenu: React.FC<GameActionsMenuProps> = ({
  numericGameId,
  gameStatus,
  isHalfRecorded,
  onRecordHalf,
  onSubmitGame,
  onChangeLine,
  showChangeLineOption,
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
      <IconButton
        onClick={handleClick}
        aria-label="Game Actions Menu"
        aria-controls={open ? 'game-actions-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        size="medium"
        sx={{ border: '1px solid #ccc' }}
      >
        <MenuIcon />
      </IconButton>
      
      <Menu
        id="game-actions-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'game-actions-button',
        }}
      >
        <MenuItem 
          component={Link} 
          to={`/stat_keeper/edit_game/${numericGameId}`}
          onClick={handleClose}
        >
          Edit Game Details
        </MenuItem>
        
        {showChangeLineOption && (
          <MenuItem
            onClick={() => handleAction(onChangeLine)}
          >
            Change Line
          </MenuItem>
        )}
        
        <Divider />
        
        <Tooltip title={isHalfRecorded ? 'Half time has already been recorded' : 'Record Half Time'}>
          <MenuItem
            onClick={() => handleAction(onRecordHalf)}
            disabled={isHalfRecorded}
            sx={{ color: isHalfRecorded ? '#999' : 'inherit' }}
          >
            Record Half
          </MenuItem>
        </Tooltip>
        
        <Tooltip title={canSubmitGame ? 'Submit game to server' : `Game status: ${gameStatus}`}>
          <MenuItem
            onClick={() => handleAction(onSubmitGame)}
            disabled={!canSubmitGame}
            sx={{ color: !canSubmitGame ? '#999' : 'inherit' }}
          >
            Submit Game
          </MenuItem>
        </Tooltip>
      </Menu>
    </Box>
  );
};

export default GameActionsMenu;
