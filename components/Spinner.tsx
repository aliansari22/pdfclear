import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div
      className="w-5 h-5 border-4 border-indigo-100 border-t-fuchsia-500 rounded-full animate-spin dark:border-indigo-900 dark:border-t-fuchsia-300"
      role="status"
      aria-label="Loading"
    />
  );
};

export default Spinner;
