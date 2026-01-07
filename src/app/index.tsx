/**
 * Main App Entry Point
 * Composes providers and app shell into the final application
 */
import React from 'react';
import { AppProviders } from './providers';
import { AppShell } from './AppShell';

function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  );
}

export default App;
