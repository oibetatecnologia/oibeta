import React, { createContext, useContext } from 'react';
import type { PlatformContextValue } from './platformContextTypes';
import { EMPTY_PLATFORM_CONTEXT } from './platformContextDefaults';

const PlatformContext = createContext<PlatformContextValue>(EMPTY_PLATFORM_CONTEXT);

interface PlatformContextProviderProps {
  value: PlatformContextValue;
  children: React.ReactNode;
}

export function PlatformContextProvider({ value, children }: PlatformContextProviderProps) {
  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatformContext(): PlatformContextValue {
  return useContext(PlatformContext);
}

export default PlatformContext;
