import React from 'react';
import AppProviders from './providers';
import AppRouter from './router';

export const App: React.FC = () => {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
};

export default App;
