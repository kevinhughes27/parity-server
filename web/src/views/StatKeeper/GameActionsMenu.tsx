import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { StoredGame } from './db'; // For gameStatus type

interface GameActionsMenuProps {
  numericGameId: number | undefined;
  gameStatus: StoredGame['status'] | undefined;
  isHalfRecorded: boolean;
  onRecordHalf: () => Promise<void>;
  onSubmitGame: () => Promise<void>;
}

const GameActionsMenu: React.FC<GameActionsMenuProps> = ({
  numericGameId,
  gameStatus,
  isHalfRecorded,
  onRecordHalf,
  onSubmitGame,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canSubmitGame = gameStatus !== 'submitted' && gameStatus !== 'uploaded';

  const toggleMenu = () => setMenuOpen(!menuOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleAction = async (action: () => Promise<void> | void) => {
    await action();
    setMenuOpen(false);
  };

  if (!numericGameId) return null;

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button
        onClick={toggleMenu}
        style={{
          background: 'none',
          border: '1px solid #ccc',
          padding: '8px 10px',
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: '1',
        }}
        aria-label="Game Actions Menu"
        aria-expanded={menuOpen}
        aria-haspopup="true"
      >
        ☰
      </button>
      {menuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 1000,
            minWidth: '200px',
          }}
          role="menu"
        >
          <Link
            to={`/stat_keeper/edit_game/${numericGameId}`}
            onClick={() => setMenuOpen(false)}
            style={{
              display: 'block',
              padding: '10px 15px',
              textDecoration: 'none',
              color: 'black',
              borderBottom: '1px solid #eee',
            }}
            role="menuitem"
          >
            Edit Game Details
          </Link>
          <button
            onClick={() => handleAction(onRecordHalf)}
            disabled={isHalfRecorded}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 15px',
              textAlign: 'left',
              border: 'none',
              background: 'none',
              cursor: isHalfRecorded ? 'not-allowed' : 'pointer',
              color: isHalfRecorded ? '#999' : 'black',
              borderBottom: '1px solid #eee',
            }}
            role="menuitem"
            title={isHalfRecorded ? 'Half time has already been recorded' : 'Record Half Time'}
          >
            Record Half
          </button>
          <button
            onClick={() => handleAction(onSubmitGame)}
            disabled={!canSubmitGame}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 15px',
              textAlign: 'left',
              border: 'none',
              background: 'none',
              cursor: !canSubmitGame ? 'not-allowed' : 'pointer',
              color: !canSubmitGame ? '#999' : 'black',
            }}
            role="menuitem"
            title={canSubmitGame ? 'Submit game to server' : `Game status: ${gameStatus}`}
          >
            Submit Game
          </button>
        </div>
      )}
    </div>
  );
};

export default GameActionsMenu;
