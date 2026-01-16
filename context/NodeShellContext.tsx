import { createContext, useContext } from 'react';

interface NodeShellContextType {
  isCollapsed: boolean;
  nodeId: string;
}

export const NodeShellContext = createContext<NodeShellContextType>({
  isCollapsed: false,
  nodeId: '',
});

export const useNodeShell = () => {
  const context = useContext(NodeShellContext);
  if (!context) {
    throw new Error('useNodeShell must be used within a NodeShellProvider (BaseNodeShell)');
  }
  return context;
};
