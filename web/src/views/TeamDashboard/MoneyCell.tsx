import React from 'react';
import format from 'format-number';

const MoneyCell = ({ data }: { data: number }) => {
  const value = Math.round(data);
  const text = format({ prefix: '$' })(value);

  return <span>{text}</span>;
};

export default MoneyCell;
