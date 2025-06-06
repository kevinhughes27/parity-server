import React from 'react';
import { Box, Typography, List, ListItem, Paper } from '@mui/material';
import { Bookkeeper } from './bookkeeper';
import { GameState } from './models';

interface PointEventsDisplayProps {
  bookkeeper: Bookkeeper;
}

const PointEventsDisplay: React.FC<PointEventsDisplayProps> = ({ bookkeeper }) => {
  const currentGameState = bookkeeper.gameState();
  const hasActivePoint = bookkeeper.activePoint !== null;

  // Get events based on whether there's an active point
  const events = hasActivePoint
    ? bookkeeper.getCurrentPointPrettyPrint()
    : bookkeeper.getLastCompletedPointPrettyPrint();

  const title = hasActivePoint
    ? "Play by Play (Current Point)"
    : "Play by Play (Previous Point)";

  return (
    <Box
      sx={{
        height: '100%',
        px: 1.25,
        borderLeft: '1px solid #ccc',
        borderRight: '1px solid #ccc',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden', // Prevent outer container from scrolling
      }}
    >
      {/* Game State Display - Fixed at top */}
      <Box sx={{ flexShrink: 0 }}> {/* This box won't shrink */}
        {hasActivePoint && (
          <Paper
            elevation={0}
            sx={{
              p: 1,
              backgroundColor: '#f9f9f9',
              borderRadius: 1,
              textAlign: 'center',
              mb: 1.25,
              fontSize: '0.9em'
            }}
          >
            <Typography variant="body2">
              <strong>Game State:</strong> {GameState[currentGameState]}
            </Typography>
          </Paper>
        )}

        <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
          {title}
        </Typography>
      </Box>

      {/* Scrollable Event List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}> {/* This box will scroll */}
        {!events || events.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No events to display.
          </Typography>
        ) : (
          <List dense sx={{ pl: 2 }}>
            {events.map((eventStr, index) => (
              <ListItem
                key={index}
                sx={{
                  display: 'list-item',
                  listStyleType: 'decimal',
                  py: 0.5,
                  color: !hasActivePoint ? 'text.secondary' : 'inherit'
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: !hasActivePoint ? 'text.secondary' : 'inherit' }}
                >
                  {eventStr}
                </Typography>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default PointEventsDisplay;
