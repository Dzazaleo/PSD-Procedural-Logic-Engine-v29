import React, { memo, useMemo, useEffect, useCallback } from 'react';
import { useNodes, useEdges, useReactFlow } from 'reactflow';
import type { NodeProps, Node } from 'reactflow';
import { PSDNodeData } from '../types';
import { createContainerContext } from '../services/psdService';
import { usePsdResolver, ResolverStatus } from '../hooks/usePsdResolver';
import { useProceduralStore } from '../store/ProceduralContext';
import { BaseNodeShell, HandleDefinition } from './BaseNodeShell';
import { useSafeDelete } from '../hooks/useSafeDelete';

interface ChannelState {
  index: number;
  status: 'idle' | 'resolved' | 'warning' | 'error';
  containerName?: string;
  layerCount: number;
  message?: string;
  debugCode?: ResolverStatus;
  resolvedContext?: any;
}

export const ContainerResolverNode = memo(({ id, data }: NodeProps<PSDNodeData>) => {
  // Read channel count from persistent data, default to 10 if new/undefined
  const channelCount = data.channelCount || 10;
  
  const nodes = useNodes();
  const edges = useEdges();
  const { setNodes } = useReactFlow();
  
  // Store Hooks
  const { registerResolved, unregisterNode } = useProceduralStore();
  const deleteNode = useSafeDelete(id);
  
  // Use specialized hook for resolution logic
  const { resolveLayer } = usePsdResolver();

  // 1. Retrieve Global Data Source (LoadPSDNode)
  const loadPsdNode = nodes.find(n => n.type === 'loadPsd') as Node<PSDNodeData>;
  const designLayers = loadPsdNode?.data?.designLayers || null;
  const globalTemplate = loadPsdNode?.data?.template || null;

  // Cleanup
  useEffect(() => {
      return () => unregisterNode(id);
  }, [id, unregisterNode]);

  // 2. Compute Channel Data
  const channels: ChannelState[] = useMemo(() => {
    return Array.from({ length: channelCount }).map((_, index) => {
      const targetHandleId = `target-${index}`;
      
      // Find connection to this handle
      const edge = edges.find(e => e.target === id && e.targetHandle === targetHandleId);

      if (!edge) {
        return { index, status: 'idle', layerCount: 0 };
      }

      if (!globalTemplate) {
         return { 
             index, 
             status: 'error', 
             layerCount: 0, 
             message: 'Source Data Locked', 
             debugCode: 'DATA_LOCKED' 
         };
      }

      const containerName = edge.sourceHandle || '';
      const containerContext = createContainerContext(globalTemplate, containerName);
      
      if (!containerContext) {
        return { 
            index, 
            status: 'error', 
            layerCount: 0, 
            message: 'Invalid Container Ref',
            debugCode: 'UNKNOWN_ERROR'
        };
      }

      // RESOLUTION LOGIC
      const result = resolveLayer(containerContext.containerName, designLayers);

      // Map ResolverStatus to UI Status
      let uiStatus: ChannelState['status'] = 'idle';
      
      switch (result.status) {
        case 'RESOLVED':
          uiStatus = 'resolved';
          break;
        case 'CASE_MISMATCH':
        case 'EMPTY_GROUP':
          uiStatus = 'warning';
          break;
        case 'MISSING_DESIGN_GROUP':
        case 'DATA_LOCKED':
        case 'NO_NAME':
        default:
          uiStatus = 'error';
          break;
      }

      // Use deep count if available, otherwise fall back to direct children
      const childCount = result.totalCount !== undefined ? result.totalCount : (result.layer?.children?.length || 0);

      return {
        index,
        status: uiStatus,
        containerName: containerContext.containerName,
        layerCount: childCount,
        message: result.message,
        debugCode: result.status,
        // Include raw context data for registration
        resolvedContext: result.layer && containerContext ? {
            container: containerContext,
            layers: result.layer.children || [],
            status: 'resolved',
            message: result.message
        } : null
      };
    });
  }, [channelCount, edges, designLayers, globalTemplate, id, resolveLayer]);

  // 3. Register Resolved Data in Store
  useEffect(() => {
    channels.forEach(channel => {
        if (channel.resolvedContext) {
            // Register as source-{index} to match the output handle
            registerResolved(id, `source-${channel.index}`, channel.resolvedContext as any);
        }
    });
  }, [channels, id, registerResolved]);

  const addChannel = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              channelCount: (node.data.channelCount || 10) + 1,
            },
          };
        }
        return node;
      })
    );
  }, [id, setNodes]);

  // Define Inputs
  const inputs = useMemo<HandleDefinition[]>(() => 
      channels.map(c => ({
          id: `target-${c.index}`,
          label: `IN ${c.index}`,
          socketColor: c.status === 'resolved' ? '!bg-emerald-500' : c.status === 'warning' ? '!bg-orange-500' : c.status === 'error' ? '!bg-red-500' : '!bg-slate-600'
      }))
  , [channels]);

  // Define Outputs
  const outputs = useMemo<HandleDefinition[]>(() => 
      channels.map(c => ({
          id: `source-${c.index}`,
          label: `OUT`,
          socketColor: c.status === 'resolved' ? '!bg-blue-500' : '!bg-slate-700'
      }))
  , [channels]);

  return (
    <BaseNodeShell
        nodeId={id}
        title="Container Resolver"
        subTitle="MULTI-MAPPER"
        headerColor="bg-slate-900"
        onDelete={deleteNode}
        inputs={inputs}
        outputs={outputs}
        className="w-80"
    >
      <div className="flex flex-col">
        {!loadPsdNode && (
            <div className="bg-red-900/20 text-red-300 text-[10px] p-1 text-center border-b border-red-900/30">
            Waiting for PSD Source...
            </div>
        )}

        {channels.map((channel) => (
          <div 
            key={channel.index} 
            className={`flex items-center h-7 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors px-2 ${
              channel.status === 'resolved' ? 'bg-emerald-900/10' : 
              channel.status === 'warning' ? 'bg-orange-900/10' : ''
            }`}
          >
            <div className="flex-1 flex items-center justify-between min-w-0">
                <div className="flex items-center space-x-2 overflow-hidden min-w-0 flex-1">
                    {channel.status === 'idle' ? (
                        <span className="text-[10px] text-slate-500 italic truncate">Unconnected</span>
                    ) : (
                        <div className="flex items-center space-x-1 min-w-0">
                            <span className="text-[10px] font-semibold text-slate-200 truncate max-w-[120px]">{channel.containerName}</span>
                            {channel.status !== 'resolved' && (
                                <span className="text-[8px] text-slate-500 truncate">({channel.debugCode})</span>
                            )}
                        </div>
                    )}
                </div>

                {channel.status !== 'idle' && (
                    <div className={`text-[8px] px-1 py-0.5 rounded border ml-1 whitespace-nowrap shrink-0 ${
                        channel.status === 'resolved' ? 'border-emerald-800 bg-emerald-900/40 text-emerald-300' :
                        channel.status === 'warning' ? 'border-orange-800 bg-orange-900/40 text-orange-300' :
                        'border-red-800 bg-red-900/40 text-red-300'
                    }`}>
                    {channel.message}
                    </div>
                )}
            </div>
          </div>
        ))}

        <button 
            onClick={addChannel}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 border-t border-slate-700 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center space-x-1"
        >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[10px] font-medium uppercase tracking-wider">Add Channel</span>
        </button>
      </div>
    </BaseNodeShell>
  );
});