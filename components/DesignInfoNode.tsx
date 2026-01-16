import React, { memo, useState, useEffect, useRef, useMemo } from 'react';
import { useReactFlow, useEdges, useNodes, NodeResizer } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { SerializableLayer, PSDNodeData } from '../types';
import { useProceduralStore } from '../store/ProceduralContext';
import { findLayerByPath, getOpticalBounds } from '../services/psdService';
import { Box, Layers, MousePointer2 } from 'lucide-react';
import { BaseNodeShell, HandleDefinition } from './BaseNodeShell';
import { useSafeDelete } from '../hooks/useSafeDelete';

// --- VISUALIZATION SUB-COMPONENT ---
interface LayerPreviewProps {
    layer: SerializableLayer;
    sourceNodeId: string;
}

const LayerPreview: React.FC<LayerPreviewProps> = ({ layer, sourceNodeId }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { psdRegistry } = useProceduralStore();
    const [metrics, setMetrics] = useState<{
        geo: { w: number, h: number },
        optical: { x: number, y: number, w: number, h: number } | null,
        canvasDims: { w: number, h: number }
    } | null>(null);

    // 1. Render Layer & Calculate Metrics
    useEffect(() => {
        const psd = psdRegistry[sourceNodeId];
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!psd || !canvas || !container) return;

        const agLayer = findLayerByPath(psd, layer.id);
        if (!agLayer || !agLayer.canvas) {
            // Clear if no visual data
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
            setMetrics(null);
            return;
        }

        // Set high-DPI resolution for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        const containerRect = container.getBoundingClientRect();
        canvas.width = containerRect.width * dpr;
        canvas.height = containerRect.height * dpr;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // --- MATH: CALCULATE FIT ---
        // We must manually calculate 'object-fit: contain' to map coordinates accurately
        const padding = 20;
        const availableW = containerRect.width - (padding * 2);
        const availableH = containerRect.height - (padding * 2);
        
        const imgW = agLayer.canvas.width;
        const imgH = agLayer.canvas.height;
        
        const scale = Math.min(availableW / imgW, availableH / imgH);
        
        const drawW = imgW * scale;
        const drawH = imgH * scale;
        
        const offsetX = (containerRect.width - drawW) / 2;
        const offsetY = (containerRect.height - drawH) / 2;

        // --- DRAW IMAGE ---
        ctx.clearRect(0, 0, containerRect.width, containerRect.height);
        ctx.drawImage(agLayer.canvas, offsetX, offsetY, drawW, drawH);

        // --- CALCULATE & DRAW OVERLAYS ---
        
        // 1. Geometric Bounds (Blue)
        const geoW = layer.coords.w;
        const geoH = layer.coords.h;
        
        ctx.strokeStyle = '#60a5fa'; // Blue-400
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(offsetX, offsetY, geoW * scale, geoH * scale);
        
        // 2. Optical Bounds (Red) - The "Trim" Box
        const opticalScan = getOpticalBounds(agLayer.canvas.getContext('2d')!, imgW, imgH);
        
        if (opticalScan) {
            ctx.strokeStyle = '#ef4444'; // Red-500
            ctx.lineWidth = 2;
            ctx.setLineDash([]); // Solid
            
            const optX = offsetX + (opticalScan.bounds.x * scale);
            const optY = offsetY + (opticalScan.bounds.y * scale);
            const optW = opticalScan.bounds.w * scale;
            const optH = opticalScan.bounds.h * scale;
            
            ctx.strokeRect(optX, optY, optW, optH);
            
            // Crosshair Center
            const centerX = optX + (optW / 2);
            const centerY = optY + (optH / 2);
            
            ctx.beginPath();
            ctx.moveTo(centerX - 5, centerY);
            ctx.lineTo(centerX + 5, centerY);
            ctx.moveTo(centerX, centerY - 5);
            ctx.lineTo(centerX, centerY + 5);
            ctx.stroke();
            
            setMetrics({
                geo: { w: geoW, h: geoH },
                optical: opticalScan.bounds,
                canvasDims: { w: imgW, h: imgH }
            });
        } else {
             setMetrics({
                geo: { w: geoW, h: geoH },
                optical: null,
                canvasDims: { w: imgW, h: imgH }
            });
        }

    }, [layer, sourceNodeId, psdRegistry]);

    if (!metrics) return (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-[10px] italic bg-slate-900/50 m-2 rounded border border-slate-700/50 border-dashed">
             <div ref={containerRef} className="absolute inset-0 pointer-events-none" />
             <canvas ref={canvasRef} className="absolute inset-0" />
             <span className="z-10 bg-slate-900/80 px-2 py-1 rounded">Select a visual layer</span>
        </div>
    );

    return (
        <div className="relative flex-1 bg-slate-900/50 m-2 rounded border border-slate-700 overflow-hidden flex flex-col">
            <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1 pointer-events-none">
                <span className="text-[9px] font-mono text-blue-300 bg-black/60 px-1.5 py-0.5 rounded border border-blue-500/30">
                    GEO: {Math.round(metrics.geo.w)}x{Math.round(metrics.geo.h)}
                </span>
                {metrics.optical && (
                    <span className="text-[9px] font-mono text-red-300 bg-black/60 px-1.5 py-0.5 rounded border border-red-500/30">
                        OPT: {Math.round(metrics.optical.w)}x{Math.round(metrics.optical.h)}
                    </span>
                )}
                 <span className="text-[9px] font-mono text-slate-400 bg-black/60 px-1.5 py-0.5 rounded border border-slate-600">
                    RAW: {Math.round(metrics.canvasDims.w)}x{Math.round(metrics.canvasDims.h)}
                </span>
            </div>
            
            {/* Canvas Container */}
            <div ref={containerRef} className="flex-1 relative w-full h-full min-h-[200px]">
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            </div>

            {/* Legend Footer */}
            <div className="h-6 bg-slate-900 border-t border-slate-700 flex items-center px-2 gap-3 shrink-0">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 border border-blue-400 border-dashed"></div>
                    <span className="text-[9px] text-slate-400">Geometry</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 border border-red-500 bg-red-500/20"></div>
                    <span className="text-[9px] text-slate-400">Optical (Trim)</span>
                </div>
            </div>
        </div>
    );
};

// --- TREE VIEW SUB-COMPONENT ---
interface LayerItemProps {
  node: SerializableLayer;
  depth?: number;
  isSelected: boolean;
  onSelect: (layer: SerializableLayer) => void;
}

const LayerItem: React.FC<LayerItemProps> = ({ node, depth = 0, isSelected, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isGroup = node.type === 'group';
  const hasChildren = isGroup && node.children && node.children.length > 0;

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) setIsOpen(!isOpen);
    onSelect(node);
  };

  const handleSelect = (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(node);
  }

  return (
    <div className="select-none">
      <div 
        className={`flex items-center py-1 pr-2 rounded cursor-pointer transition-colors border-l-2 ${
            isSelected 
            ? 'bg-indigo-600/20 border-indigo-400' 
            : 'hover:bg-slate-700/50 border-transparent'
        } ${!node.isVisible ? 'opacity-50' : ''}`}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        onClick={hasChildren ? toggleOpen : handleSelect}
      >
        <div className="mr-1.5 w-4 flex justify-center shrink-0" onClick={(e) => { e.stopPropagation(); toggleOpen(e); }}>
          {hasChildren ? (
             <svg className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
             </svg>
          ) : <div className="w-3" />}
        </div>

        <div className="mr-2 text-slate-400 shrink-0">
           {isGroup ? (
             <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
           ) : (
             <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
           )}
        </div>
        <span className={`text-xs truncate ${isSelected ? 'text-white font-medium' : 'text-slate-300'}`}>{node.name}</span>
      </div>

      {isOpen && hasChildren && (
        <div className="border-l border-slate-700 ml-[15px]">
          {/* REVERSED: Render top-most layers first (Photoshop Style) */}
          {[...node.children!].reverse().map((child) => (
            <LayerItem key={child.id} node={child} depth={depth + 1} isSelected={isSelected && false} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

// --- MAIN NODE ---
export const DesignInfoNode = memo(({ id }: NodeProps) => {
  const edges = useEdges();
  const nodes = useNodes();
  const [selectedLayer, setSelectedLayer] = useState<SerializableLayer | null>(null);
  const deleteNode = useSafeDelete(id);
  
  const sourceEdge = useMemo(() => edges.find(e => e.target === id), [edges, id]);
  const sourceNode = useMemo(() => 
      sourceEdge ? nodes.find(n => n.id === sourceEdge.source) : null
  , [sourceEdge, nodes]);

  const designLayers = (sourceNode?.data as PSDNodeData)?.designLayers;

  const inputs = useMemo<HandleDefinition[]>(() => [
      { id: 'input', label: 'Layer Tree', socketColor: '!bg-blue-500' }
  ], []);

  return (
    <BaseNodeShell
        nodeId={id}
        title="Design Inspector"
        subTitle="METADATA"
        headerColor="bg-slate-900"
        onDelete={deleteNode}
        inputs={inputs}
        className="w-[500px]" // Initial width
    >
      <div className="h-[450px] relative flex flex-col">
        <NodeResizer minWidth={500} minHeight={450} isVisible={true} handleStyle={{ background: 'transparent', border: 'none' }} lineStyle={{ border: 'none' }} />
        
        <div className="bg-slate-900/50 p-2 border-b border-slate-700 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-slate-400 font-medium">
                {selectedLayer ? `Selected: ${selectedLayer.name}` : 'Select a Layer'}
            </span>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* LEFT: Tree View */}
            <div className="w-1/2 overflow-y-auto custom-scrollbar border-r border-slate-700 bg-slate-800/50 p-1">
                {!designLayers ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs gap-2">
                    <Box className="w-6 h-6 opacity-50" />
                    <span>No Layers Loaded</span>
                </div>
                ) : (
                <div className="py-1">
                    {/* REVERSED: Render top-most layers first (Photoshop Style) */}
                    {[...designLayers].reverse().map(layer => (
                    <LayerItem 
                            key={layer.id} 
                            node={layer} 
                            isSelected={selectedLayer?.id === layer.id} 
                            onSelect={setSelectedLayer} 
                    />
                    ))}
                </div>
                )}
            </div>

            {/* RIGHT: Visual Preview */}
            <div className="w-1/2 flex flex-col bg-black/20">
                {selectedLayer && sourceNode ? (
                    <LayerPreview layer={selectedLayer} sourceNodeId={sourceNode.id} />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600 gap-2">
                        <MousePointer2 className="w-8 h-8 opacity-20" />
                        <span className="text-xs">Select a layer to inspect</span>
                    </div>
                )}
            </div>
        </div>
      </div>
    </BaseNodeShell>
  );
});