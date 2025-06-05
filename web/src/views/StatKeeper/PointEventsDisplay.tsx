import React from 'react';

interface PointEventsDisplayProps {
  title: string;
  events: string[] | null | undefined;
}

const PointEventsDisplay: React.FC<PointEventsDisplayProps> = ({ title, events }) => {
  return (
    <div
      style={{
        flex: 1.5,
        padding: '0 10px',
        borderLeft: '1px solid #ccc',
        borderRight: '1px solid #ccc',
        overflowY: 'auto',
        height: '100%', // Ensure it takes height in flex container
      }}
    >
      <h4>{title}</h4>
      {!events || events.length === 0 ? (
        <p>No events to display.</p>
      ) : (
        <ul style={{ listStyleType: 'decimal', paddingLeft: '20px', margin: 0 }}>
          {events.map((eventStr, index) => (
            <li key={index}>{eventStr}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PointEventsDisplay;
