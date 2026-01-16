import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { Handle, Position, useUpdateNodeInternals, useReactFlow } from 'reactflow';
import { Minus, Maximize2, X, MoreHorizontal } from 'lucide-react';
import { NodeShellContext } from '../context/NodeShellContext';

export interface HandleDefinition {
  id: string;
  label?: string;
  socketColor?: string; // Tailwind class like '!bg-emerald-500'
  position?: number; // Optional manual vertical positioning percentage
  isConnected?: boolean;
}

export interface BaseNodeShellProps {
  title: string;
  subTitle?: string;
  headerColor?: string; // e.g., 'bg-slate-900' or 'bg-emerald-900'
  nodeId: string;
  inputs?: HandleDefinition[];
  outputs?: HandleDefinition[];
  onDelete?: () => void;
  children: React.ReactNode;
  className?: string; // For width overrides
  isPolished?: boolean; // Visual indicator for verified state
}

export const BaseNodeShell = memo(({
  title,
  subTitle,
  headerColor = 'bg-slate-900',
  nodeId,
  inputs = [],
  outputs = [],
  onDelete,
  children,
  className = '',
  isPolished = false
}: BaseNodeShellProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const updateNodeInternals = useUpdateNodeInternals();
  const { deleteElements } = useReactFlow();

  // PHYSICS: Force React Flow to recalculate edge positions immediately after layout shift
  useEffect(() => {
    requestAnimationFrame(() => {
        updateNodeInternals(nodeId);
    });
  }, [isCollapsed, nodeId, updateNodeInternals]);

  const toggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node selection
    setIsCollapsed(prev => !prev);
  }, []);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    } else {
      deleteElements({ nodes: [{ id: nodeId }] });
    }
  }, [onDelete, deleteElements, nodeId]);

  // Handle Styling Helper
  const getHandleStyle = (def: HandleDefinition) => {
    // Base styles + dynamic color overrides
    // We use !important classes (via !) to override React Flow defaults
    return `${def.socketColor || '!bg-slate-400'} !w-3 !h-3 !border-2 !border-slate-800 transition-transform hover:scale-125 z-50`;
  };

  const contextValue = useMemo(() => ({ isCollapsed, nodeId }), [isCollapsed, nodeId]);

  return (
    <NodeShellContext.Provider value={contextValue}>
      <div 
          className={`
            relative flex flex-col rounded-lg shadow-2xl border transition-all duration-300 font-sans group 
            ${className} 
            ${isCollapsed ? 'w-auto' : ''} 
            ${isPolished ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-slate-600 hover:border-slate-500'}
            bg-slate-800 
            /* CRITICAL: overflow-visible needed for handles to protrude */
            overflow-visible
          `}
          style={{ minWidth: isCollapsed ? 'auto' : undefined }}
      >
        
        {/* HEADER */}
        <div 
            className={`
                flex items-center justify-between p-2 h-10 border-b transition-colors duration-300 relative z-20 rounded-t-lg
                ${headerColor} 
                ${isPolished ? 'border-emerald-500/30' : 'border-slate-700'}
            `}
            onDoubleClick={toggleCollapse}
        >
            <div className="flex items-center space-x-2 overflow-hidden">
                <div className={`p-1 rounded bg-black/20 border border-white/5 ${isCollapsed ? 'animate-pulse' : ''}`}>
                    {isCollapsed ? <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" /> : <MoreHorizontal className="w-3.5 h-3.5 text-slate-500" />}
                </div>
                <div className="flex flex-col leading-none min-w-0">
                    <span className={`text-sm font-bold tracking-tight truncate ${isPolished ? 'text-emerald-100' : 'text-slate-200'}`}>
                        {title}
                    </span>
                    {(subTitle && !isCollapsed) && (
                        <span className={`text-[9px] font-mono font-bold tracking-widest uppercase truncate ${isPolished ? 'text-emerald-500/70' : 'text-slate-500'}`}>
                            {subTitle}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center space-x-1 pl-2">
                <button 
                    onClick={toggleCollapse}
                    className="nodrag nopan p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title={isCollapsed ? "Expand" : "Minimize"}
                >
                    {isCollapsed ? <Maximize2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                </button>
                <button 
                    onClick={handleDelete}
                    className="nodrag nopan p-1 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-colors"
                    title="Remove Node"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        </div>

        {/* CONTENT BODY */}
        {/* 
            Collapsed State Logic:
            - h-0 to collapse height.
            - overflow-visible to allow child handles to float out (upwards to header).
            - Children must handle their own visibility (text vs handles) via NodeShellContext.
        */}
        <div 
            className={`
                relative flex flex-col transition-all duration-300 ease-in-out bg-slate-900 rounded-b-lg
                ${isCollapsed ? 'h-0' : 'h-auto'}
            `}
        >
             {children}
        </div>

        {/* --- LEGACY INPUT HANDLES (Left) --- */}
        <div className="absolute inset-y-0 left-0 w-0 z-10 pointer-events-none">
            {inputs.map((input, i) => (
              <div key={input.id} className="absolute pointer-events-auto" style={{ top: isCollapsed ? '50%' : `${50 + (i * 24)}px`, left: '-6px' }}>
                <Handle
                    type="target"
                    position={Position.Left}
                    id={input.id}
                    className={getHandleStyle(input)}
                />
                {!isCollapsed && input.label && (
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 px-1 rounded border border-slate-700 pointer-events-none z-50">
                      {input.label}
                    </span>
                )}
              </div>
            ))}
        </div>

        {/* --- LEGACY OUTPUT HANDLES (Right) --- */}
        <div className="absolute inset-y-0 right-0 w-0 z-10 pointer-events-none">
            {outputs.map((output, i) => (
              <div key={output.id} className="absolute pointer-events-auto" style={{ top: isCollapsed ? '50%' : `${50 + (i * 24)}px`, right: '-6px' }}>
                <Handle
                    type="source"
                    position={Position.Right}
                    id={output.id}
                    className={getHandleStyle(output)}
                />
                {!isCollapsed && output.label && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 px-1 rounded border border-slate-700 pointer-events-none z-50">
                      {output.label}
                    </span>
                )}
              </div>
            ))}
        </div>

      </div>
    </NodeShellContext.Provider>
  );
});