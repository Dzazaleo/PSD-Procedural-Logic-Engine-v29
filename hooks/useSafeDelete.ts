import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import { useProceduralStore } from '../store/ProceduralContext';

/**
 * Hook to safely delete a node by first purging its data from the global store,
 * ensuring no "ghost data" remains before the UI component is unmounted.
 * 
 * Protocol:
 * 1. Purge Binary Data (Store Action: PURGE_NODE_DATA)
 * 2. Remove UI Element (React Flow Action: deleteElements)
 */
export const useSafeDelete = (nodeId: string) => {
  const { deleteElements } = useReactFlow();
  const { purgeNodeData } = useProceduralStore();

  const handleDelete = useCallback(() => {
    console.info(`[SafeDelete] Initiating deletion protocol for node: ${nodeId}`);
    
    // 1. Purge Binary & Metadata from Store (Store-First)
    // This removes heavy buffers (ag-psd objects) and context references
    purgeNodeData(nodeId);

    // 2. Remove UI Component & Edges (React Flow)
    // React Flow automatically cleans up connected edges
    deleteElements({ nodes: [{ id: nodeId }] });
  }, [nodeId, deleteElements, purgeNodeData]);

  return handleDelete;
};