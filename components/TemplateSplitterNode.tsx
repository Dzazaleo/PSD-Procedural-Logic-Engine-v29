import React, { memo, useMemo } from 'react';
import { useEdges, useNodes } from 'reactflow';
import type { NodeProps, Node } from 'reactflow';
import { PSDNodeData } from '../types';
import { useProceduralStore } from '../store/ProceduralContext';
import { getSemanticThemeObject } from '../services/psdService';
import { BaseNodeShell, HandleDefinition } from './BaseNodeShell';
import { useSafeDelete } from '../hooks/useSafeDelete';

export const TemplateSplitterNode = memo(({ id }: NodeProps) => {
  const edges = useEdges();
  const nodes = useNodes();
  const deleteNode = useSafeDelete(id);

  // Find the source node connected to this node's input handle
  const sourceNode = useMemo(() => {
    const edge = edges.find(e => e.target === id && e.targetHandle === 'input');
    if (!edge) return null;
    return nodes.find(n => n.id === edge.source) as Node<PSDNodeData> | undefined;
  }, [edges, nodes, id]);

  const template = sourceNode?.data?.template;
  
  // SORT LOGIC: Alphabetical
  const sortedContainers = useMemo(() => {
      if (!template?.containers) return [];
      return [...template.containers].sort((a, b) => a.name.localeCompare(b.name));
  }, [template]);

  // Helper to check if a specific container handle is connected
  const isHandleConnected = (handleId: string) => {
    return edges.some(e => e.source === id && e.sourceHandle === handleId);
  };

  // Define Inputs
  const inputs = useMemo<HandleDefinition[]>(() => [
      { id: 'input', label: 'Template Source', socketColor: '!bg-blue-500' }
  ], []);

  // Define Outputs
  const outputs = useMemo<HandleDefinition[]>(() => 
      sortedContainers.map(container => ({
          id: container.name,
          label: container.name,
          socketColor: isHandleConnected(container.name) ? '!bg-emerald-500' : '!bg-slate-600'
      }))
  , [sortedContainers, edges]); // edges dependency needed for isHandleConnected check

  return (
    <BaseNodeShell
        nodeId={id}
        title="Template Splitter"
        subTitle="DEMUX"
        headerColor="bg-slate-900"
        onDelete={deleteNode}
        inputs={inputs}
        outputs={outputs}
        className="w-56"
    >
      <div className="p-2 space-y-2">
        {!sourceNode || !template ? (
          <div className="flex flex-col items-center justify-center py-4 text-slate-500">
             <span className="text-xs italic">No Template Detected</span>
          </div>
        ) : (
          sortedContainers.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-2">
              Template has no containers
            </div>
          ) : (
            <div className="flex flex-col space-y-1">
              {sortedContainers.map((container, index) => {
                const theme = getSemanticThemeObject(container.name, index);
                const isConnected = isHandleConnected(container.name);
                
                return (
                  <div 
                    key={container.id} 
                    className={`relative flex items-center justify-between p-1.5 rounded border border-slate-700/50 bg-slate-900/30 transition-colors h-7`}
                  >
                    <div className="flex items-center space-x-2 overflow-hidden w-full">
                       <div className={`w-2 h-2 rounded-full ${theme.dot} shrink-0`}></div>
                       <span className={`text-[10px] font-medium truncate ${theme.text}`} title={container.name}>
                         {container.name}
                       </span>
                    </div>
                    {/* Visual indicator of connection state only (Logic handled by Shell) */}
                    {isConnected && (
                        <div className="w-1 h-1 rounded-full bg-emerald-500 shrink-0 mr-1"></div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </BaseNodeShell>
  );
});