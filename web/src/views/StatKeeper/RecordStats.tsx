import React from 'react';
import { Bookkeeper } from './bookkeeper';
import PointEventsDisplay from './PointEventsDisplay';
import ActionBar from './ActionBar';
import { Box, Button } from '@mui/material';

interface RecordStatsProps {
  bookkeeper: Bookkeeper;
  actionBarHeight: string;
}

const RecordStats: React.FC<RecordStatsProps> = ({ bookkeeper, actionBarHeight }) => {
  const fullHomeRoster = bookkeeper.getHomeParticipants();
  const fullAwayRoster = bookkeeper.getAwayParticipants();

  const handlePlayerClick = async (playerName: string, isHomeTeamPlayer: boolean) => {
    if (bookkeeper.shouldRecordNewPass()) {
      await bookkeeper.performAction(bk => bk.recordPass(playerName));
    } else {
      await bookkeeper.performAction(bk => bk.recordFirstActor(playerName, isHomeTeamPlayer));
    }
  };

  const handleActionClick = async (actionFunc: (bk: Bookkeeper) => void) => {
    await bookkeeper.performAction(actionFunc);
  };

  const renderPlayerButton = (playerName: string, isHomeTeamButton: boolean) => {
    const buttonState = bookkeeper.getPlayerButtonState(playerName, isHomeTeamButton);
    const isTeamInPossession = isHomeTeamButton === bookkeeper.homePossession;

    const getButtonStyles = () => {
      switch (buttonState.variant) {
        case 'not-on-line':
          return {
            color: '#adb5bd',
            backgroundColor: '#f8f9fa',
            border: '1px solid #eee',
            fontWeight: 'normal',
          };
        case 'active':
          return {
            color: '#000',
            backgroundColor: '#a7d7f5',
            border: '1px solid #2196f3',
            fontWeight: 'bold',
          };
        case 'enabled':
          return {
            color: '#000',
            backgroundColor: isTeamInPossession ? '#e3f2fd' : '#f0f0f0',
            border: isTeamInPossession ? '1px solid #2196f3' : '1px solid #ccc',
            fontWeight: 'normal',
          };
        case 'disabled-possession':
          return {
            color: '#000',
            backgroundColor: '#90caf9',
            border: '1px solid #2196f3',
            fontWeight: 'normal',
          };
        case 'disabled-no-possession':
          return {
            color: '#999',
            backgroundColor: '#e0e0e0',
            border: '1px solid #ccc',
            fontWeight: 'normal',
          };
        default:
          return {
            color: '#000',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            fontWeight: 'normal',
          };
      }
    };

    return (
      <Button
        key={playerName}
        onClick={() => handlePlayerClick(playerName, isHomeTeamButton)}
        disabled={!buttonState.enabled}
        fullWidth
        variant="text"
        size="small"
        title={buttonState.reason}
        sx={{
          justifyContent: 'flex-start',
          mb: 0.5,
          py: 1,
          borderRadius: 1,
          fontSize: '0.9em',
          textTransform: 'none',
          ...getButtonStyles(),
        }}
      >
        {playerName}
      </Button>
    );
  };

  const pullState = bookkeeper.getActionButtonState('pull');
  const pointState = bookkeeper.getActionButtonState('point');
  const dropState = bookkeeper.getActionButtonState('drop');
  const throwawayState = bookkeeper.getActionButtonState('throwaway');
  const dState = bookkeeper.getActionButtonState('d');
  const catchDState = bookkeeper.getActionButtonState('catchD');
  const undoState = bookkeeper.getActionButtonState('undo');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1.25 }}>
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', height: '100%' }}>
          <Box sx={{ width: '30%', pr: 1, overflow: 'auto' }}>
            {fullHomeRoster.map(player => renderPlayerButton(player, true))}
          </Box>

          <Box sx={{ width: '40%' }}>
            <PointEventsDisplay bookkeeper={bookkeeper} />
          </Box>

          <Box sx={{ width: '30%', pl: 1, overflow: 'auto' }}>
            {fullAwayRoster.map(player => renderPlayerButton(player, false))}
          </Box>
        </Box>
      </Box>

      <ActionBar
        actionBarHeight={actionBarHeight}
        primaryActions={[
          {
            label: 'Pull',
            onClick: () => handleActionClick(bk => bk.recordPull()),
            disabled: !pullState.enabled,
            variant: 'outlined',
          },
          {
            label: 'Point!',
            onClick: () => handleActionClick(bk => bk.recordPoint()),
            disabled: !pointState.enabled,
            color: 'success',
            variant: 'contained',
          },
          {
            label: 'Drop',
            onClick: () => handleActionClick(bk => bk.recordDrop()),
            disabled: !dropState.enabled,
            variant: 'outlined',
          },
          {
            label: 'Throwaway',
            onClick: () => handleActionClick(bk => bk.recordThrowAway()),
            disabled: !throwawayState.enabled,
            variant: 'outlined',
          },
          {
            label: 'D (Block)',
            onClick: () => {
              if (!bookkeeper.firstActor) {
                // we never see this and we don't want to.
                // and at least for me the confusing part is to do the throwaway first
                alert('Select the player who got the D first.');
                return;
              }
              handleActionClick(bk => bk.recordD());
            },
            disabled: !dState.enabled,
            variant: 'outlined',
          },
          {
            label: 'Catch D',
            onClick: () => {
              if (!bookkeeper.firstActor) {
                // we never see this and we don't want to.
                // and at least for me the confusing part is to do the throwaway first
                alert('Select the player who got the Catch D first.');
                return;
              }
              handleActionClick(bk => bk.recordCatchD());
            },
            disabled: !catchDState.enabled,
            variant: 'outlined',
          },
        ]}
        secondaryActions={[
          {
            label: 'Undo',
            onClick: () => handleActionClick(bk => bk.undo()),
            disabled: !undoState.enabled,
            color: 'warning',
            variant: 'contained',
          },
        ]}
      />
    </Box>
  );
};

export default RecordStats;
