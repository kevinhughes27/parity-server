import React, { useState } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface JsonViewerProps {
  data: any;
  name?: string;
  level?: number;
  defaultExpanded?: boolean;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ 
  data, 
  name, 
  level = 0, 
  defaultExpanded = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || level < 2);

  const handleCopy = (value: any) => {
    const textToCopy = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    navigator.clipboard.writeText(textToCopy);
  };

  const getValueColor = (value: any): string => {
    if (value === null) return '#808080';
    if (typeof value === 'string') return '#d14';
    if (typeof value === 'number') return '#099';
    if (typeof value === 'boolean') return '#0086b3';
    return '#333';
  };

  const renderValue = (value: any, key?: string) => {
    if (value === null) {
      return (
        <Box component="span" sx={{ color: getValueColor(value), fontStyle: 'italic' }}>
          null
        </Box>
      );
    }

    if (typeof value === 'string') {
      return (
        <Box component="span" sx={{ color: getValueColor(value) }}>
          "{value}"
        </Box>
      );
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return (
        <Box component="span" sx={{ color: getValueColor(value) }}>
          {String(value)}
        </Box>
      );
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <Box component="span" sx={{ color: '#333' }}>[]</Box>;
      }

      return (
        <Box sx={{ ml: level * 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
               onClick={() => setIsExpanded(!isExpanded)}>
            <IconButton size="small" sx={{ p: 0, mr: 0.5 }}>
              {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
            </IconButton>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
              {key && `${key}: `}[{value.length} items]
            </Typography>
          </Box>
          {isExpanded && (
            <Box sx={{ ml: 2, borderLeft: '1px solid #ddd', pl: 1 }}>
              {value.map((item, index) => (
                <Box key={index} sx={{ mb: 0.5 }}>
                  <JsonViewer 
                    data={item} 
                    name={`[${index}]`} 
                    level={level + 1} 
                    defaultExpanded={false}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      );
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return <Box component="span" sx={{ color: '#333' }}>{'{}'}</Box>;
      }

      return (
        <Box sx={{ ml: level * 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
               onClick={() => setIsExpanded(!isExpanded)}>
            <IconButton size="small" sx={{ p: 0, mr: 0.5 }}>
              {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
            </IconButton>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
              {key && `${key}: `}{'{'}...{'}'}
            </Typography>
          </Box>
          {isExpanded && (
            <Box sx={{ ml: 2, borderLeft: '1px solid #ddd', pl: 1 }}>
              {keys.map((objKey) => (
                <Box key={objKey} sx={{ mb: 0.5 }}>
                  <JsonViewer 
                    data={value[objKey]} 
                    name={objKey} 
                    level={level + 1} 
                    defaultExpanded={false}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      );
    }

    return <Box component="span">{String(value)}</Box>;
  };

  // For primitive values at root level
  if (level === 0 && (typeof data !== 'object' || data === null)) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', fontFamily: 'monospace' }}>
        {name && (
          <Typography variant="body2" sx={{ fontWeight: 'bold', mr: 1 }}>
            {name}:
          </Typography>
        )}
        {renderValue(data)}
      </Box>
    );
  }

  // For objects and arrays
  return (
    <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
      {level === 0 ? (
        renderValue(data, name)
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#0086b3', mr: 1 }}>
            {name}:
          </Typography>
          {renderValue(data)}
          <Tooltip title="Copy value">
            <IconButton size="small" onClick={() => handleCopy(data)}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};

export default JsonViewer;
