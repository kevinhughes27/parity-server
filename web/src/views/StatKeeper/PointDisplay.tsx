import React, { useEffect, useRef } from 'react';
import { Box, Typography, List, ListItem, Paper } from '@mui/material';
import { Bookkeeper, GameState } from './bookkeeper';

interface PointDisplayProps {
  bookkeeper: Bookkeeper;
}

const PointDisplay: React.FC<PointDisplayProps> = ({ bookkeeper }) => {
  const currentGameState = bookkeeper.gameState();
  const hasActivePoint = bookkeeper.activePoint !== null;
  const eventsContainerRef = useRef<HTMLDivElement>(null);

  // Get events based on whether there's an active point
  const events = hasActivePoint
    ? bookkeeper.getCurrentPointPrettyPrint()
    : bookkeeper.getLastCompletedPointPrettyPrint();

  const title = hasActivePoint ? 'Play by Play (Current Point)' : 'Play by Play (Previous Point)';

  // Auto-scroll to bottom whenever events change
  useEffect(() => {
    if (eventsContainerRef.current && hasActivePoint) {
      const container = eventsContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [events, hasActivePoint]);

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
        flexGrow: 1,
      }}
    >
      {/* Game State Display - Fixed at top */}
      <Box sx={{ flexShrink: 0 }}>
        {' '}
        {/* This box won't shrink */}
        <Paper
          elevation={0}
          sx={{
            p: 1,
            backgroundColor: '#f9f9f9',
            borderRadius: 1,
            textAlign: 'center',
            mb: 1.25,
            fontSize: '0.9em',
          }}
        >
          <Typography variant="body2">
            <strong>Game State:</strong> {GameState[currentGameState] || 'SelectingLines'}
          </Typography>
        </Paper>
        <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
          {title}
        </Typography>
      </Box>

      {/* Scrollable Event List */}
      <Box ref={eventsContainerRef} sx={{ flexGrow: 1, overflowX: 'hidden', overflowY: 'auto' }}>
        {!events || events.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No events to display.
          </Typography>
        ) : (
          <List dense sx={{ px: 0.5 }}>
            {events.map((eventStr, index) => (
              <ListItem
                key={index}
                sx={{
                  display: 'flex',
                  py: 0.5,
                  px: 0,
                  color: !hasActivePoint ? 'text.secondary' : 'inherit',
                }}
              >
                <Typography
                  variant="body2"
                  component="span"
                  sx={{
                    minWidth: '24px',
                    mr: 1,
                    fontWeight: 'bold',
                    color: !hasActivePoint ? 'text.secondary' : 'inherit',
                  }}
                >
                  {index + 1}.
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: !hasActivePoint ? 'text.secondary' : 'inherit',
                    flexGrow: 1,
                  }}
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

export default PointDisplay;
