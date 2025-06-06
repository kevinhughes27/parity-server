import React from 'react';
import { Box, Typography, List, ListItem } from '@mui/material';

interface PointEventsDisplayProps {
  title: string;
  events: string[] | null | undefined;
}

const PointEventsDisplay: React.FC<PointEventsDisplayProps> = ({ title, events }) => {
  return (
    <Box
      sx={{
        flex: 1.5,
        px: 1.25,
        borderLeft: '1px solid #ccc',
        borderRight: '1px solid #ccc',
        overflow: 'auto',
        height: '100%',
      }}
    >
      <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
        {title}
      </Typography>
      
      {!events || events.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No events to display.
        </Typography>
      ) : (
        <List dense sx={{ pl: 2 }}>
          {events.map((eventStr, index) => (
            <ListItem key={index} sx={{ display: 'list-item', listStyleType: 'decimal', py: 0.5 }}>
              <Typography variant="body2">{eventStr}</Typography>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default PointEventsDisplay;
