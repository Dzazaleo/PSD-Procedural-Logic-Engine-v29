import React, { memo, useMemo, useEffect } from 'react';
import { useEdges } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { useProceduralStore } from '../store/ProceduralContext';
import { getSemanticThemeObject } from '../services/psdService';
import { BaseNodeShell, HandleDefinition } from './BaseNodeShell';
import { useSafeDelete } from '../hooks/useSafeDelete';

export const TargetSplitterNode = memo(({ id }: NodeProps) => {
  const edges = useEdges();
  const deleteNode = useSafeDelete(id);
  
  // Connect to Store
  const { templateRegistry, registerTemplate, unregisterNode } = useProceduralStore();

  // 1. Identify Upstream TargetTemplate Node ID
  const upstreamNodeId = useMemo(() => {
    const edge = edges.find(e => e.target === id && e.targetHandle === 'template-input');
    return edge ? edge.source : null;
  }, [edges, id]);

  // 2. Fetch Template from Store
  const template = upstreamNodeId ? templateRegistry[upstreamNodeId] : null;

  // 3. Broadcast Template as "Self" to Store
  useEffect(() => {
    if (template) {
        registerTemplate(id, template);
    }
  }, [id, template, registerTemplate]);

  // Cleanup
  useEffect(() => {
    return () => unregisterNode(id);
  }, [id, unregisterNode]);

  // SORT LOGIC: Alphabetical
  const sortedContainers = useMemo(() => {
      if (!template?.containers) return [];
      return [...template.containers].sort((a, b) => a.name.localeCompare(b.name));
  }, [template]);

  // 4. Identify connected content slots (UI logic)
  const connectedSlots = useMemo(() => {
    const connected = new Set<string>();
    edges.forEach(e => {
        if (e.target === id && e.targetHandle && e.targetHandle !== 'template-input') {
            connected.add(e.targetHandle);
        }
    });
    return connected;
  }, [edges, id]);

  const isTemplateConnected = !!template;

  // Define Inputs: Template Input + Dynamic Slot Inputs
  const inputs = useMemo<HandleDefinition[]>(() => {
      const base: HandleDefinition[] = [
          { id: 'template-input', label: 'Target Template', socketColor: '!bg-emerald-500' }
      ];
      
      const slots = sortedContainers.map((c, i) => {
          const isFilled = connectedSlots.has(c.name);
          const theme = getSemanticThemeObject(c.name, i);
          // If filled, use the theme color for the socket to indicate activity
          const socketColor = isFilled ? theme.dot.replace('bg-', '!bg-') : '!bg-slate-700';
          
          return {
              id: c.name,
              label: c.name,
              socketColor: `${socketColor} !border-2`
          };
      });

      return [...base, ...slots];
  }, [sortedContainers, connectedSlots]);

  // Define Outputs: Slot Bounds
  const outputs = useMemo<HandleDefinition[]>(() => 
      sortedContainers.map(c => ({
          id: `slot-bounds-${c.name}`,
          label: 'Bounds',
          socketColor: '!bg-emerald-500'
      }))
  , [sortedContainers]);

  // Calculate dynamic height based on container count to hint BaseNodeShell (optional, but good for alignment)
  // BaseNodeShell handles stack with spacing.

  return (
    <BaseNodeShell
        nodeId={id}
        title="Target Splitter"
        subTitle="ASSEMBLY"
        headerColor="bg-emerald-900"
        onDelete={deleteNode}
        inputs={inputs}
        outputs={outputs}
        className="w-64"
    >
      <div className="p-2 space-y-2">
        
        {/* State: No Template Connected */}
        {!isTemplateConnected && (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-slate-500 border border-dashed border-slate-700 rounded bg-slate-900/30">
             <span className="text-xs text-center">Connect Target Template to initialize slots</span>
          </div>
        )}

        {/* State: Template Connected, Render Slots */}
        {isTemplateConnected && (
          <div className="flex flex-col space-y-3">
             <div className="text-[9px] text-slate-400 font-medium px-1 flex justify-between">
                <span>SLOT DEFINITIONS</span>
                <span>{connectedSlots.size} / {sortedContainers.length} Filled</span>
             </div>

             {/* Spacer for the 'Target Template' input handle to align visually below it */}
             <div className="h-2"></div>

             <div className="space-y-1">
               {sortedContainers.map((container, index) => {
                 const isFilled = connectedSlots.has(container.name);
                 const theme = getSemanticThemeObject(container.name, index);
                 
                 return (
                   <div 
                     key={container.id} 
                     className={`flex items-center justify-between p-1.5 pl-2 rounded border transition-colors h-7 ${
                       isFilled 
                         ? `${theme.bg.replace('/20', '/10')} ${theme.border.replace('border-', 'border-opacity-30 border-')}` 
                         : 'bg-slate-900/30 border-slate-700/50'
                     }`}
                   >
                     <div className="flex flex-col leading-none overflow-hidden w-full mr-2">
                        <span className={`text-[10px] font-medium truncate ${isFilled ? theme.text : 'text-slate-400'}`}>
                          {container.name}
                        </span>
                        <span className="text-[8px] text-slate-600 font-mono">
                           {Math.round(container.normalized.w * 100)}% x {Math.round(container.normalized.h * 100)}%
                        </span>
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
        )}
      </div>
    </BaseNodeShell>
  );
});