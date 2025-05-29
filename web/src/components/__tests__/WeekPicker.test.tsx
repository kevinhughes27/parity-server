import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WeekPicker from '../WeekPicker';

describe('WeekPicker', () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    week: 1,
    weeks: [0, 1, 2, 3],
    onChange: mockOnChange,
    mobile: false,
  };

  it('renders week options correctly', () => {
    render(<WeekPicker {...defaultProps} />);
    
    // Check if the select element is rendered
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    
    // Open the select menu
    fireEvent.mouseDown(select);
    
    // Check if all week options are rendered
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getAllByText('Week 1').length).toBeGreaterThan(0);
    expect(screen.getByText('Week 2')).toBeInTheDocument();
    expect(screen.getByText('Week 3')).toBeInTheDocument();
  });

  it('calls onChange when a different week is selected', () => {
    render(<WeekPicker {...defaultProps} />);
    
    // Open the select menu
    const select = screen.getByRole('combobox');
    fireEvent.mouseDown(select);
    
    // Select a different week
    const week2Option = screen.getByText('Week 2');
    fireEvent.click(week2Option);
    
    // Check if onChange was called with the correct value
    expect(mockOnChange).toHaveBeenCalledWith(2);
  });

  it('renders mobile version correctly', () => {
    render(<WeekPicker {...defaultProps} mobile={true} />);
    
    // Check if the label is rendered in mobile version
    expect(screen.getByLabelText('Week')).toBeInTheDocument();
    
    // Check if the select element is rendered
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });
}); 