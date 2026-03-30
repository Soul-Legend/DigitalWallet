import {create} from 'zustand';
import {LogEntry} from '../types';

interface AppState {
  // Logs
  logs: LogEntry[];
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  
  // Holder state
  holderDID: string | null;
  setHolderDID: (did: string) => void;
  
  // Issuer state
  issuerDID: string | null;
  setIssuerDID: (did: string) => void;
  
  // Navigation state
  currentModule: 'emissor' | 'titular' | 'verificador' | 'logs' | 'home';
  setCurrentModule: (module: 'emissor' | 'titular' | 'verificador' | 'logs' | 'home') => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Logs
  logs: [],
  addLog: (log) =>
    set((state) => ({
      logs: [
        ...state.logs,
        {
          ...log,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
        },
      ],
    })),
  clearLogs: () => set({logs: []}),
  
  // Holder state
  holderDID: null,
  setHolderDID: (did) => set({holderDID: did}),
  
  // Issuer state
  issuerDID: null,
  setIssuerDID: (did) => set({issuerDID: did}),
  
  // Navigation state
  currentModule: 'home',
  setCurrentModule: (module) => set({currentModule: module}),
}));
