import React, { memo, useState, useEffect, useCallback } from 'react';
import { Handle, Position, useUpdateNodeInternals } from 'reactflow';
import { Minus, Maximize2, X, MoreHorizontal } from 'lucide-react';

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
    if (onDelete) onDelete();
  }, [onDelete]);

  // Handle Styling Helper
  const getHandleStyle = (def: HandleDefinition) => {
    // Base styles + dynamic color overrides
    // We use !important classes (via !) to override React Flow defaults
    return `${def.socketColor || '!bg-slate-400'} !w-3 !h-3 !border-2 !border-slate-800 transition-transform hover:scale-125 z-50`;
  };

  return (
    <div 
        className={`flex relative rounded-lg shadow-2xl border transition-all duration-300 font-sans group ${className} ${isCollapsed ? 'w-auto' : ''} ${isPolished ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-slate-600 hover:border-slate-500'}`}
        style={{ minWidth: isCollapsed ? 'auto' : undefined }}
    >
      
      {/* --- LEFT COLUMN: INPUT HANDLES --- */}
      {/* Placed outside the main overflow container to ensure edges clip correctly to the socket */}
      <div className="flex flex-col justify-center space-y-3 -ml-1.5 py-10 z-50 absolute left-0 top-0 bottom-0 pointer-events-none">
        {inputs.map((input) => (
          <div key={input.id} className="relative flex items-center h-4 pointer-events-auto">
             <Handle
                type="target"
                position={Position.Left}
                id={input.id}
                className={getHandleStyle(input)}
             />
             {!isCollapsed && input.label && (
                <span className="absolute left-4 text-[9px] text-slate-500 font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 px-1 rounded border border-slate-700 pointer-events-none">
                   {input.label}
                </span>
             )}
          </div>
        ))}
      </div>

      {/* --- CENTER COLUMN: MAIN CONTENT --- */}
      <div className={`flex flex-col flex-1 overflow-hidden rounded-lg bg-slate-950 transition-all duration-300`}>
        
        {/* HEADER */}
        <div 
            className={`flex items-center justify-between p-2 border-b transition-colors duration-300 ${headerColor} ${isPolished ? 'border-emerald-500/30' : 'border-slate-700'}`}
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
                {onDelete && (
                    <button 
                        onClick={handleDelete}
                        className="nodrag nopan p-1 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-colors"
                        title="Remove Node"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>
        </div>

        {/* CONTENT BODY */}
        {/* We use specific CSS to visually hide the content but keep it mounted */}
        <div 
            className={`transition-all duration-300 ease-in-out bg-slate-900 ${isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[1200px] opacity-100'}`}
        >
             {children}
        </div>
      </div>

      {/* --- RIGHT COLUMN: OUTPUT HANDLES --- */}
      <div className="flex flex-col justify-center space-y-3 -mr-1.5 py-10 z-50 absolute right-0 top-0 bottom-0 pointer-events-none">
        {outputs.map((output) => (
          <div key={output.id} className="relative flex items-center justify-end h-4 pointer-events-auto">
             <Handle
                type="source"
                position={Position.Right}
                id={output.id}
                className={getHandleStyle(output)}
             />
             {!isCollapsed && output.label && (
                <span className="absolute right-4 text-[9px] text-slate-500 font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 px-1 rounded border border-slate-700 pointer-events-none">
                   {output.label}
                </span>
             )}
          </div>
        ))}
      </div>

    </div>
  );
});