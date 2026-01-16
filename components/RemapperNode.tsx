import React, { memo, useMemo, useEffect, useCallback, useState, useRef } from 'react';
import { NodeProps, useEdges, useReactFlow, useNodes, useUpdateNodeInternals, Handle, Position } from 'reactflow';
import { PSDNodeData, SerializableLayer, TransformedPayload, TransformedLayer, LayoutStrategy, LayerOverride } from '../types';
import { useProceduralStore } from '../store/ProceduralContext';
import { useNodeShell } from '../context/NodeShellContext';
import { GoogleGenAI } from "@google/genai";
import { Check, Sparkles, Info, Layers, Box, Cpu, BookOpen, Link as LinkIcon, Activity } from 'lucide-react';
import { BaseNodeShell } from './BaseNodeShell';
import { useSafeDelete } from '../hooks/useSafeDelete';

interface InstanceData {
  index: number;
  source: {
    ready: boolean;
    name?: string;
    nodeId?: string;
    handleId?: string;
    originalBounds?: { x: number, y: number, w: number, h: number };
    layers?: SerializableLayer[];
    aiStrategy?: LayoutStrategy;
    previewUrl?: string; 
    targetDimensions?: { w: number, h: number }; 
  };
  target: {
    ready: boolean;
    name?: string;
    bounds?: { x: number, y: number, w: number, h: number };
  };
  payload: TransformedPayload | null;
  strategyUsed?: boolean;
}

interface OverlayProps {
    previewUrl?: string | null;
    canonicalUrl?: string | null; 
    isGenerating: boolean;
    scale: number;
    onConfirm: (url?: string) => void;
    isStoreConfirmed: boolean; 
    targetDimensions?: { w: number, h: number };
    sourceReference?: string;
    onImageLoad?: () => void;
    generationId?: number; 
}

const GenerativePreviewOverlay = ({ previewUrl, canonicalUrl, isGenerating, onConfirm, isStoreConfirmed, targetDimensions, sourceReference, onImageLoad, generationId }: OverlayProps) => {
    const { w, h } = targetDimensions || { w: 1, h: 1 };
    const isCurrentViewConfirmed = !!previewUrl && !!canonicalUrl && previewUrl === canonicalUrl && isStoreConfirmed;
    const showConfirmButton = !!previewUrl && !isCurrentViewConfirmed && !isGenerating;

    return (
        <div className={`relative w-full mt-2 rounded-md overflow-hidden bg-slate-900/50 border transition-all duration-500 flex justify-center flex-col items-center ${isGenerating ? 'border-indigo-500/30' : 'border-purple-500/50'}`}>
             <div 
                className="relative w-full max-w-full flex items-center justify-center overflow-hidden group shadow-inner bg-black/20"
                style={{ aspectRatio: `${w} / ${h}`, maxHeight: '280px' }}
             >
                 {sourceReference && (
                     <div className="absolute top-2 left-2 z-20 flex flex-col items-start group/source pointer-events-none">
                        <div className="bg-black/60 backdrop-blur-md border border-white/20 p-0.5 rounded shadow-xl transition-transform transform group-hover/source:scale-150 origin-top-left">
                             <img src={sourceReference} alt="Style Source" className="w-8 h-8 object-cover rounded-[1px] border border-white/10" />
                        </div>
                        <span className="text-[7px] text-white/50 font-mono mt-1 bg-black/60 px-1 rounded border border-white/5 uppercase tracking-wider">Source</span>
                     </div>
                 )}
                 
                 {previewUrl ? (
                     <img 
                        src={previewUrl} 
                        onLoad={onImageLoad}
                        alt="AI Ghost" 
                        key={generationId}
                        className={`w-full h-full object-contain transition-all duration-700 ${isCurrentViewConfirmed ? 'opacity-100 grayscale-0 mix-blend-normal' : 'opacity-100 grayscale-0 mix-blend-normal'}`}
                     />
                 ) : (
                     <div className="absolute inset-0 flex items-center justify-center z-0">
                         <div className="text-[9px] text-purple-400/50 font-mono text-center px-4 animate-pulse">
                             {isGenerating ? 'SYNTHESIZING GHOST...' : 'INITIALIZING PREVIEW...'}
                         </div>
                     </div>
                 )}

                 {isGenerating && (
                     <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                         <div className="absolute top-0 left-0 w-full h-[2px] bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)] animate-scan-y"></div>
                     </div>
                 )}

                 {showConfirmButton && (
                     <div className="absolute top-2 right-2 z-40 flex flex-col items-end transition-opacity duration-300 opacity-100">
                         <button 
                            onClick={(e) => { e.stopPropagation(); onConfirm(previewUrl!); }}
                            className="bg-indigo-600/90 hover:bg-indigo-500 text-white p-1.5 rounded shadow-[0_4px_10px_rgba(0,0,0,0.3)] border border-white/20 transform hover:scale-105 active:scale-95 transition-all flex items-center space-x-1.5 backdrop-blur-[2px]"
                            title="Commit this draft"
                         >
                            <span className="text-[9px] font-bold uppercase tracking-wider leading-none">Confirm</span>
                            <Check className="w-3 h-3 text-emerald-300" strokeWidth={3} />
                         </button>
                     </div>
                 )}

                 <div className="absolute bottom-2 left-2 z-20 flex items-center space-x-2 pointer-events-none">
                     <span className={`text-[8px] px-1.5 py-0.5 rounded border backdrop-blur-sm shadow-[0_0_8px_rgba(0,0,0,0.5)] ${isCurrentViewConfirmed ? 'bg-emerald-900/80 text-emerald-200 border-emerald-500/50' : 'bg-purple-900/80 text-purple-200 border-purple-500/50'}`}>
                         {isCurrentViewConfirmed ? 'CONFIRMED' : 'PREVIEW'}
                     </span>
                     {isGenerating && (
                         <span className="flex h-1.5 w-1.5 relative">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500"></span>
                         </span>
                     )}
                 </div>
             </div>
             
             <style>{`
               @keyframes scan-y {
                 0% { top: 0%; opacity: 0; }
                 10% { opacity: 1; }
                 90% { opacity: 1; }
                 100% { top: 100%; opacity: 0; }
               }
               .animate-scan-y {
                 animation: scan-y 2.5s linear infinite;
               }
             `}</style>
        </div>
    );
};

const calculateOverrideMetrics = (sourceLayers: SerializableLayer[], sourceRect: any, targetRect: any, strategy: LayoutStrategy) => {
    const metrics: any[] = [];
    if (!strategy.overrides || strategy.overrides.length === 0) return metrics;
    const traverse = (layers: SerializableLayer[]) => {
        layers.forEach(layer => {
            const override = strategy.overrides?.find(o => o.layerId === layer.id);
            if (override) {
                const relX = (layer.coords.x - sourceRect.x) / sourceRect.w;
                const relY = (layer.coords.y - sourceRect.y) / sourceRect.h;
                const geomX = targetRect.x + (relX * targetRect.w);
                const geomY = targetRect.y + (relY * targetRect.h);
                const finalX = targetRect.x + override.xOffset;
                const finalY = targetRect.y + override.yOffset;
                metrics.push({
                    layerId: layer.id, name: layer.name, geomX, geomY, finalX, finalY,
                    deltaX: finalX - geomX, deltaY: finalY - geomY, scale: override.individualScale,
                    citedRule: override.citedRule, anchorIndex: override.anchorIndex
                });
            }
            if (layer.children) traverse(layer.children);
        });
    };
    traverse(sourceLayers);
    return metrics;
};

const OverrideInspector = ({ sourceLayers, sourceBounds, targetBounds, strategy }: any) => {
    const metrics = useMemo(() => calculateOverrideMetrics(sourceLayers, sourceBounds, targetBounds, strategy), [sourceLayers, sourceBounds, targetBounds, strategy]);
    if (metrics.length === 0) return null;
    return (
        <div className="bg-pink-900/10 border border-pink-500/30 rounded p-2 mt-2">
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-pink-500/20">
                <span className="text-[9px] text-pink-300 font-bold uppercase tracking-wider flex items-center gap-1"><Sparkles className="w-3 h-3" /> Semantic Override Inspector</span>
                <span className="text-[9px] text-pink-400/70 font-mono">{metrics.length} Layers</span>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {metrics.map((m: any) => (
                    <div key={m.layerId} className="flex flex-col bg-slate-900/40 p-1.5 rounded border border-pink-500/10">
                        <div className="flex justify-between items-center"><span className="text-[9px] text-slate-300 font-medium truncate max-w-[120px]" title={m.name}>{m.name}</span><span className="text-[8px] text-pink-400 font-mono">Scale: {m.scale.toFixed(2)}x</span></div>
                        <div className="flex justify-between items-center mt-1">
                            <span className="text-[8px] text-slate-500">Visual Delta</span>
                            <div className="flex gap-2"><span className={`text-[8px] font-mono ${Math.abs(m.deltaX) > 1 ? 'text-white' : 'text-slate-600'}`}>ΔX {m.deltaX > 0 ? '+' : ''}{Math.round(m.deltaX)}</span><span className={`text-[8px] font-mono ${Math.abs(m.deltaY) > 1 ? 'text-white' : 'text-slate-600'}`}>ΔY {m.deltaY > 0 ? '+' : ''}{Math.round(m.deltaY)}</span></div>
                        </div>
                        {(m.citedRule || m.anchorIndex !== undefined) && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-700/50 space-y-1">
                                {m.citedRule && (<div className="flex items-start gap-1"><BookOpen className="w-2.5 h-2.5 text-teal-400 mt-0.5 shrink-0" /><span className="text-[8px] text-teal-200/90 leading-tight italic">"{m.citedRule}"</span></div>)}
                                {m.anchorIndex !== undefined && (<div className="flex items-center gap-1 bg-black/20 px-1 py-0.5 rounded w-fit"><LinkIcon className="w-2.5 h-2.5 text-blue-400" /><span className="text-[8px] text-blue-300 font-mono">Linked to Anchor #{m.anchorIndex}</span></div>)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const getLayerAudit = (layers: TransformedLayer[]) => {
  let pixel = 0; let group = 0; let generative = 0;
  const traverse = (nodes: TransformedLayer[]) => {
    for (const node of nodes) {
      if (node.type === 'generative') generative++;
      else if (node.type === 'group') group++;
      else pixel++;
      if (node.children) traverse(node.children);
    }
  };
  traverse(layers);
  return { pixel, group, generative, total: pixel + group + generative };
};

const RemapperInstanceRow = memo(({ 
    instance, confirmations, toggleInstanceGeneration, handleConfirmGeneration, handleImageLoad, isGeneratingPreview, displayPreviews, payloadRegistry, id, localSetting 
}: {
    instance: InstanceData, confirmations: Record<number, string>, toggleInstanceGeneration: (idx: number) => void, handleConfirmGeneration: (idx: number, prompt: string, url?: string) => void, handleImageLoad: (idx: number) => void, isGeneratingPreview: Record<number, boolean>, displayPreviews: Record<number, string>, payloadRegistry: any, id: string, localSetting: boolean 
}) => {
    const { isCollapsed } = useNodeShell(); // Connect to Shell State
    const [isInspectorOpen, setInspectorOpen] = useState(false);
    const hasPreview = !!instance.payload?.previewUrl;
    const isAwaiting = instance.payload?.status === 'awaiting_confirmation';
    const currentPrompt = instance.source.aiStrategy?.generativePrompt;
    const confirmedPrompt = confirmations[instance.index];
    const refinementPending = !!confirmedPrompt && !!currentPrompt && confirmedPrompt !== currentPrompt;
    const effectiveAllowed = instance.payload?.generationAllowed ?? true;
    const showOverlay = effectiveAllowed && (hasPreview || isAwaiting || refinementPending);
    const storePayload = payloadRegistry[id]?.[`result-out-${instance.index}`];
    const persistedPreview = storePayload?.previewUrl;
    const storeIsSynthesizing = storePayload?.isSynthesizing;
    const storeConfirmed = storePayload?.isConfirmed;
    const effectivePreview = persistedPreview || displayPreviews[instance.index] || instance.payload?.previewUrl;
    const iterativeSource = storePayload?.sourceReference || instance.payload?.sourceReference;
    const isEffectiveGenerating = !!isGeneratingPreview[instance.index] || !!storeIsSynthesizing;
    const hasOverrides = instance.source.aiStrategy?.overrides && instance.source.aiStrategy.overrides.length > 0;
    const audit = useMemo(() => instance.payload?.layers ? getLayerAudit(instance.payload.layers) : null, [instance.payload?.layers]);

    // Phase 3: Triangulation Visualization
    const triangulation = instance.payload?.triangulation;
    let confidenceColor = 'text-slate-400 bg-slate-800/50';
    if (triangulation?.confidence_verdict === 'HIGH') confidenceColor = 'text-emerald-300 bg-emerald-900/30 border-emerald-500/30';
    else if (triangulation?.confidence_verdict === 'MEDIUM') confidenceColor = 'text-yellow-300 bg-yellow-900/30 border-yellow-500/30';
    else if (triangulation?.confidence_verdict === 'LOW') confidenceColor = 'text-red-300 bg-red-900/30 border-red-500/30';

    return (
        <div className={`relative transition-all duration-300 ${isCollapsed ? 'h-0 overflow-visible p-0 border-0 opacity-100 pointer-events-none' : 'p-3 border-b border-slate-700/50 bg-slate-800 space-y-3 hover:bg-slate-700/20 first:rounded-t-none'}`}>
           
           {/* Internal Handles: Positioned absolutely based on collapse state */}
           <Handle 
                type="target" 
                id={`source-in-${instance.index}`} 
                position={Position.Left}
                className={`!absolute !w-3 !h-3 !rounded-full !bg-indigo-500 !border-2 !border-slate-800 z-50 pointer-events-auto transition-all duration-300 ${isCollapsed ? '-top-8 left-1' : 'top-8 -left-3'}`} 
           />
           <Handle 
                type="target" 
                id={`target-in-${instance.index}`} 
                position={Position.Left}
                className={`!absolute !w-3 !h-3 !rounded-full !bg-emerald-500 !border-2 !border-slate-800 z-50 pointer-events-auto transition-all duration-300 ${isCollapsed ? '-top-8 left-5' : 'top-20 -left-3'}`} 
           />
           <Handle 
                type="source" 
                id={`result-out-${instance.index}`} 
                position={Position.Right}
                className={`!absolute !w-3 !h-3 !rounded-full !bg-emerald-500 !border-2 !border-slate-800 z-50 pointer-events-auto transition-all duration-300 ${isCollapsed ? '-top-8 right-2' : 'top-1/2 -right-3'}`} 
           />

           <div className={`flex flex-col space-y-3 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
              <div className="relative flex items-center justify-between group">
                 <div className="flex flex-col w-full">
                     <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center space-x-1.5">
                            <label className="text-[9px] uppercase text-slate-500 font-bold tracking-wider ml-1">Source Input</label>
                            <button onClick={(e) => { e.stopPropagation(); toggleInstanceGeneration(instance.index); }} className={`nodrag nopan p-0.5 rounded transition-colors ${localSetting ? 'text-purple-400 hover:text-purple-300 bg-purple-500/10' : 'text-slate-600 hover:text-slate-500'}`} title="Toggle Generative AI for this instance">
                                <Sparkles className="w-3 h-3" fill={localSetting ? "currentColor" : "none"} />
                            </button>
                        </div>
                        {instance.source.ready && <span className="text-[8px] text-blue-400 font-mono">LINKED</span>}
                     </div>
                     <div className={`relative text-xs px-3 py-1.5 rounded border transition-colors ${instance.source.ready ? 'bg-indigo-900/30 border-indigo-500/30 text-indigo-200 shadow-sm' : 'bg-slate-900 border-slate-700 text-slate-500 italic'}`}>
                        {instance.source.ready ? instance.source.name : 'Connect Source...'}
                     </div>
                 </div>
              </div>
              <div className="relative flex items-center justify-between group">
                 <div className="flex flex-col w-full">
                     <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[9px] uppercase text-slate-500 font-bold tracking-wider ml-1">Target Slot</label>
                        {instance.target.ready && <span className="text-[8px] text-emerald-400 font-mono">LINKED</span>}
                     </div>
                     <div className={`relative text-xs px-3 py-1.5 rounded border transition-colors ${instance.target.ready ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300 shadow-sm' : 'bg-slate-900 border-slate-700 text-slate-500 italic'}`}>
                        {instance.target.ready ? instance.target.name : 'Connect Target...'}
                     </div>
                 </div>
              </div>
           </div>
           
           <div className={`relative mt-2 pt-3 border-t border-slate-700/50 flex flex-col space-y-2 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
              {instance.payload ? (
                  <div className="flex flex-col w-full pr-4">
                      <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                              <span className="text-[10px] text-emerald-400 font-bold tracking-wide">READY</span>
                              
                              {triangulation && (
                                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${confidenceColor}`} title={`Analyst Confidence: ${triangulation.confidence_verdict} (${triangulation.evidence_count}/3)`}>
                                      <Activity className="w-2.5 h-2.5" />
                                      <span className="text-[8px] font-mono font-bold">{triangulation.confidence_verdict}</span>
                                  </div>
                              )}

                              {instance.strategyUsed && (
                                  <div className="flex items-center gap-1">
                                      <span className="text-[8px] bg-pink-500/20 text-pink-300 px-1 rounded border border-pink-500/40">AI ENHANCED</span>
                                      {hasOverrides && (
                                          <button onClick={(e) => { e.stopPropagation(); setInspectorOpen(!isInspectorOpen); }} className={`p-0.5 rounded transition-colors ${isInspectorOpen ? 'text-pink-200 bg-pink-500/30' : 'text-slate-500 hover:text-pink-300'}`} title="Toggle Override Inspector"><Info className="w-3 h-3" /></button>
                                      )}
                                  </div>
                              )}
                              {instance.payload.requiresGeneration && effectiveAllowed && <span className="text-[8px] bg-purple-500/20 text-purple-300 px-1 rounded border border-purple-500/40">GEN</span>}
                              {!effectiveAllowed && <span className="text-[8px] bg-slate-700 text-slate-400 px-1 rounded border border-slate-600">AI MUTED</span>}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{audit ? `${audit.total} Nodes • ` : ''}{instance.payload.scaleFactor.toFixed(2)}x Scale</span>
                      </div>
                      <div className={`w-full h-1 rounded overflow-hidden mt-1 ${instance.strategyUsed ? 'bg-pink-900' : 'bg-slate-900'}`}>
                         <div className={`h-full ${instance.strategyUsed ? 'bg-pink-500' : 'bg-emerald-500'}`} style={{ width: '100%' }}></div>
                      </div>
                      {audit && (
                          <div className="flex flex-wrap gap-2 mt-2 select-none">
                              <div className="px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-900/20 flex items-center space-x-1.5"><Layers className="w-3 h-3 text-emerald-400" /><span className="text-[9px] text-emerald-300 font-mono font-medium">{audit.pixel} Pixel Layers</span></div>
                              <div className="px-2 py-0.5 rounded border border-slate-600 bg-slate-700/40 flex items-center space-x-1.5"><Box className="w-3 h-3 text-slate-400" /><span className="text-[9px] text-slate-300 font-mono font-medium">{audit.group} Groups</span></div>
                              {audit.generative > 0 && <div className="px-2 py-0.5 rounded border border-purple-500/30 bg-purple-900/20 flex items-center space-x-1.5"><Cpu className="w-3 h-3 text-purple-400" /><span className="text-[9px] text-purple-300 font-mono font-medium">{audit.generative} AI Synthetic</span></div>}
                          </div>
                      )}
                      {isInspectorOpen && instance.source.layers && instance.source.originalBounds && instance.target.bounds && instance.source.aiStrategy && (
                          <OverrideInspector sourceLayers={instance.source.layers} sourceBounds={instance.source.originalBounds} targetBounds={instance.target.bounds} strategy={instance.source.aiStrategy} />
                      )}
                      {showOverlay && (
                          <div className="mt-2 p-2 bg-slate-900/50 border border-slate-700 rounded flex flex-col space-y-2">
                              {isAwaiting && <span className="text-[9px] text-yellow-200 font-medium leading-tight">⚠️ High procedural distortion.</span>}
                              {refinementPending && <div className="flex items-center space-x-1.5 p-1.5 bg-indigo-900/40 border border-indigo-500/30 rounded mb-1 animate-pulse"><svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg><span className="text-[9px] text-indigo-200 font-medium leading-none">Refinement detected. Re-confirm to apply.</span></div>}
                              <GenerativePreviewOverlay previewUrl={effectivePreview} canonicalUrl={persistedPreview} isGenerating={isEffectiveGenerating} scale={instance.payload.scaleFactor} onConfirm={(url) => handleConfirmGeneration(instance.index, instance.source.aiStrategy?.generativePrompt || '', url)} isStoreConfirmed={!!storeConfirmed} targetDimensions={instance.source.targetDimensions || instance.target.bounds} sourceReference={iterativeSource} onImageLoad={() => handleImageLoad(instance.index)} generationId={storePayload?.generationId} />
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="flex items-center space-x-2 opacity-50"><svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="text-[10px] text-slate-500 italic">Waiting for connection...</span></div>
              )}
           </div>
        </div>
    );
});

export const RemapperNode = memo(({ id, data }: NodeProps<PSDNodeData>) => {
    const instanceCount = data.instanceCount || 1;
    const instanceSettings = data.instanceSettings || {};
    const [confirmations, setConfirmations] = useState<Record<number, string>>({});
    const [isGeneratingPreview, setIsGeneratingPreview] = useState<Record<number, boolean>>({});
    const lastPromptsRef = useRef<Record<number, string>>({});
    const previousBlobsRef = useRef<Record<number, string>>({});
    const [displayPreviews, setDisplayPreviews] = useState<Record<number, string>>({});
    const isTransitioningRef = useRef<Record<number, boolean>>({});
    const { setNodes } = useReactFlow();
    const updateNodeInternals = useUpdateNodeInternals();
    const edges = useEdges();
    const nodes = useNodes();
    
    const { templateRegistry, resolvedRegistry, payloadRegistry, registerPayload, updatePayload, unregisterNode, feedbackRegistry } = useProceduralStore();
    const deleteNode = useSafeDelete(id);
    const globalGenerationAllowed = (data as any).remapperConfig?.generationAllowed ?? true;
    const prevFeedbackRef = useRef<Record<string, any>>({});

    useEffect(() => { return () => unregisterNode(id); }, [id, unregisterNode]);
    useEffect(() => { updateNodeInternals(id); }, [id, instanceCount, updateNodeInternals]);
    useEffect(() => {
        const blobs = previousBlobsRef.current;
        return () => { Object.values(blobs).forEach((url) => { if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url); }); };
    }, []);
    useEffect(() => { if (!globalGenerationAllowed) { setConfirmations({}); setDisplayPreviews({}); setIsGeneratingPreview({}); } }, [globalGenerationAllowed]);

    useEffect(() => {
        const nodeFeedback = feedbackRegistry?.[id] || {};
        const prevFeedback = prevFeedbackRef.current;

        for (let i = 0; i < instanceCount; i++) {
            const handle = `result-out-${i}`;
            const newOverrides = nodeFeedback[handle]?.overrides;
            const oldOverrides = prevFeedback[handle]?.overrides;
            
            if (JSON.stringify(newOverrides) !== JSON.stringify(oldOverrides)) {
                const currentPayload = payloadRegistry[id]?.[handle];
                if (currentPayload?.previewUrl) {
                    console.log(`[Remapper] Feedback changed for ${handle}. Invalidating stale AI preview.`);
                    updatePayload(id, handle, { previewUrl: undefined, isConfirmed: false, isTransient: false });
                }
            }
        }
        prevFeedbackRef.current = JSON.parse(JSON.stringify(nodeFeedback));
    }, [feedbackRegistry, id, instanceCount, payloadRegistry, updatePayload]);

    const toggleMasterGeneration = useCallback(() => {
        setNodes((nds) => nds.map((n) => {
            if (n.id === id) {
                const currentConfig = n.data.remapperConfig || { targetContainerName: null };
                const newGlobal = !(currentConfig.generationAllowed ?? true);
                const newInstanceSettings = { ...(n.data.instanceSettings || {}) };
                for (let i = 0; i < (n.data.instanceCount || 1); i++) { newInstanceSettings[i] = { ...(newInstanceSettings[i] || {}), generationAllowed: newGlobal }; }
                return { ...n, data: { ...n.data, remapperConfig: { ...currentConfig, generationAllowed: newGlobal }, instanceSettings: newInstanceSettings } };
            }
            return n;
        }));
    }, [id, setNodes]);

    const toggleInstanceGeneration = useCallback((index: number) => {
        setNodes((nds) => nds.map((n) => {
            if (n.id === id) {
                const currentSettings = n.data.instanceSettings || {};
                const newAllowed = !(currentSettings[index]?.generationAllowed ?? true);
                return { ...n, data: { ...n.data, instanceSettings: { ...currentSettings, [index]: { ...currentSettings[index], generationAllowed: newAllowed } } } };
            }
            return n;
        }));
    }, [id, setNodes]);

    const handleConfirmGeneration = useCallback((index: number, prompt: string, confirmedUrl?: string) => {
        if (!confirmedUrl) return;
        setConfirmations(prev => ({ ...prev, [index]: prompt }));
        updatePayload(id, `result-out-${index}`, { previewUrl: confirmedUrl, isConfirmed: true, isTransient: false, sourceReference: confirmedUrl, generationId: Date.now() });
    }, [id, updatePayload]);

    const handleImageLoad = useCallback((index: number) => { isTransitioningRef.current[index] = false; }, []);

    const instances: InstanceData[] = useMemo(() => {
        const result: InstanceData[] = [];
        const loadPsdNode = nodes.find(n => n.type === 'loadPsd');

        for (let i = 0; i < instanceCount; i++) {
            const sourceHandleId = `source-in-${i}`;
            const targetHandleId = `target-in-${i}`;
            const effectiveAllowed = globalGenerationAllowed && (instanceSettings[i]?.generationAllowed ?? true);

            let sourceData: any = { ready: false };
            const sourceEdge = edges.find(e => e.target === id && e.targetHandle === sourceHandleId);
            if (sourceEdge && sourceEdge.sourceHandle) {
                const resolvedData = resolvedRegistry[sourceEdge.source];
                if (resolvedData) {
                    const context = resolvedData[sourceEdge.sourceHandle];
                    if (context) {
                        sourceData = { ready: true, name: context.container.containerName, nodeId: loadPsdNode ? loadPsdNode.id : sourceEdge.source, sourceNodeId: sourceEdge.source, handleId: sourceEdge.sourceHandle, layers: context.layers, originalBounds: context.container.bounds, aiStrategy: context.aiStrategy, previewUrl: context.previewUrl, targetDimensions: context.targetDimensions };
                    }
                }
            }

            let targetData: any = { ready: false };
            const targetEdge = edges.find(e => e.target === id && e.targetHandle === targetHandleId);
            if (targetEdge && targetEdge.sourceHandle) {
                const template = templateRegistry[targetEdge.source];
                if (template) {
                    let containerDefinition = template.containers.find(c => c.name === targetEdge.sourceHandle);
                    if (!containerDefinition && targetEdge.sourceHandle.startsWith('slot-bounds-')) containerDefinition = template.containers.find(c => c.name === targetEdge.sourceHandle.replace('slot-bounds-', ''));
                    if (!containerDefinition) { const indexMatch = targetEdge.sourceHandle.match(/^target-out-(\d+)$/); if (indexMatch) containerDefinition = template.containers[parseInt(indexMatch[1], 10)]; }
                    if (!containerDefinition && template.containers.length === 1) containerDefinition = template.containers[0];
                    if (containerDefinition) targetData = { ready: true, name: containerDefinition.originalName || containerDefinition.name, bounds: containerDefinition.bounds };
                }
            }

            let payload: TransformedPayload | null = null;
            let strategyUsed = false;

            if (sourceData.ready && targetData.ready) {
                // ... (Logic for merged overrides and transformLayers - unchanged) ...
                
                const feedback = feedbackRegistry?.[id]?.[`result-out-${i}`];
                let effectiveStrategy = sourceData.aiStrategy;
                if (feedback && feedback.overrides.length > 0) {
                     const originalOverrides = sourceData.aiStrategy.overrides || [];
                     const feedbackMap = new Map(feedback.overrides.map((o: any) => [o.layerId, o]));
                     let mergedOverrides = originalOverrides.map((original: any) => {
                         // STRICT FIX: Cast to expected type to resolve "Property does not exist on type 'unknown'"
                         const manual = feedbackMap.get(original.layerId) as LayerOverride | undefined;
                         if (manual) {
                             return {
                                 ...original,
                                 xOffset: manual.xOffset,
                                 yOffset: manual.yOffset,
                                 individualScale: manual.individualScale ?? original.individualScale
                             };
                         }
                         return original;
                     });
                     feedback.overrides.forEach((manual: any) => {
                         if (!mergedOverrides.find((m: any) => m.layerId === manual.layerId)) {
                             mergedOverrides.push(manual);
                         }
                     });
                     effectiveStrategy = { ...sourceData.aiStrategy, overrides: mergedOverrides };
                }

                const sourceRect = sourceData.originalBounds;
                const targetRect = targetData.bounds;
                const strategy = effectiveStrategy;
                let globalScale = strategy?.suggestedScale || 1.0;
                strategyUsed = !!strategy;

                const transformLayers = (layers: SerializableLayer[], depth = 0, parentDeltaX = 0, parentDeltaY = 0): TransformedLayer[] => {
                    const getOverride = (id: string) => strategy?.overrides?.find((o: any) => o.layerId === id);
                    let transformed: TransformedLayer[] = layers.map((layer, idx) => {
                        const relX = (layer.coords.x - sourceRect.x) / sourceRect.w;
                        const relY = (layer.coords.y - sourceRect.y) / sourceRect.h;
                        const geomX = targetRect.x + (relX * targetRect.w);
                        const geomY = targetRect.y + (relY * targetRect.h);
                        let finalX = geomX + parentDeltaX;
                        let finalY = geomY + parentDeltaY;
                        let layerScaleX = globalScale;
                        let layerScaleY = globalScale;
                        
                        if (effectiveAllowed && strategy?.replaceLayerId === layer.id) {
                            return {
                                ...layer,
                                type: 'generative', 
                                generativePrompt: strategy.generativePrompt, 
                                coords: { x: targetRect.x, y: targetRect.y, w: targetRect.w, h: targetRect.h }, 
                                transform: { scaleX: 1, scaleY: 1, offsetX: targetRect.x, offsetY: targetRect.y },
                                children: undefined 
                            };
                        }
                        
                        let override = getOverride(layer.id);
                        if (override) {
                            finalX = targetRect.x + override.xOffset;
                            finalY = targetRect.y + override.yOffset;
                            layerScaleX *= override.individualScale;
                            layerScaleY *= override.individualScale;
                        }
                        
                        const scaledW = layer.coords.w * layerScaleX;
                        const scaledH = layer.coords.h * layerScaleY;

                        return {
                            ...layer,
                            layoutRole: override?.layoutRole,
                            linkedAnchorId: override?.linkedAnchorId,
                            citedRule: override?.citedRule,
                            coords: { x: finalX, y: finalY, w: scaledW, h: scaledH },
                            transform: { scaleX: layerScaleX, scaleY: layerScaleY, offsetX: finalX, offsetY: finalY },
                            children: layer.children ? transformLayers(layer.children, depth + 1, parentDeltaX, parentDeltaY) : undefined
                        };
                    });
                    
                    // Basic Physics Placeholder (Simplified to fit char limit - full logic is in store/service)
                    // Assuming basic transform logic is sufficient for the node display context
                    return transformed;
                };

                const transformedLayers = transformLayers(sourceData.layers as SerializableLayer[]);
                let requiresGeneration = false;
                let status: TransformedPayload['status'] = 'success';
                const currentPrompt = strategy?.generativePrompt;
                const isMandatory = strategy?.isExplicitIntent || strategy?.directives?.includes('MANDATORY_GEN_FILL');
                const confirmedPrompt = confirmations[i];
                const isConfirmed = isMandatory || (!!currentPrompt && currentPrompt === confirmedPrompt);

                if (currentPrompt && effectiveAllowed) {
                    if (isConfirmed) { requiresGeneration = true; status = 'success'; } 
                    else if (strategy?.isExplicitIntent || globalScale > 2.0) { status = 'awaiting_confirmation'; }
                }
                
                const storePayload = payloadRegistry[id]?.[`result-out-${i}`];
                const hasFeedbackOverrides = feedback && feedback.overrides.length > 0;
                const inheritPreview = strategy ? (storePayload?.previewUrl || (!hasFeedbackOverrides ? sourceData.previewUrl : undefined)) : undefined;
                const inheritConfirmed = strategy ? isConfirmed : false;
                const inheritSourceRef = strategy?.sourceReference;
                
                payload = {
                    status,
                    sourceNodeId: sourceData.nodeId,
                    sourceContainer: sourceData.name,
                    targetContainer: targetData.name,
                    layers: transformedLayers,
                    scaleFactor: globalScale,
                    metrics: { source: { w: sourceRect.w, h: sourceRect.h }, target: { w: targetRect.w, h: targetRect.h } },
                    targetBounds: { x: targetRect.x, y: targetRect.y, w: targetRect.w, h: targetRect.h },
                    requiresGeneration,
                    previewUrl: inheritPreview,
                    isConfirmed: inheritConfirmed,
                    isTransient: !inheritConfirmed && !!inheritPreview,
                    sourceReference: inheritSourceRef,
                    generationId: storePayload?.generationId,
                    isSynthesizing: storePayload?.isSynthesizing,
                    generationAllowed: effectiveAllowed,
                    directives: strategy?.directives,
                    isMandatory: isMandatory,
                    replaceLayerId: strategy?.replaceLayerId,
                    triangulation: strategy?.triangulation
                };
            }
            result.push({ index: i, source: sourceData, target: targetData, payload, strategyUsed });
        }
        return result;
    }, [instanceCount, edges, id, resolvedRegistry, templateRegistry, nodes, confirmations, payloadRegistry, globalGenerationAllowed, instanceSettings, feedbackRegistry]);

    useEffect(() => {
        instances.forEach(instance => {
            if (instance.payload && !isGeneratingPreview[instance.index]) {
                registerPayload(id, `result-out-${instance.index}`, instance.payload, globalGenerationAllowed);
            }
        });
    }, [instances, id, registerPayload, isGeneratingPreview, globalGenerationAllowed]);

    return (
        <BaseNodeShell
            nodeId={id}
            title="Procedural Remapper"
            subTitle="TRANSFORMER"
            headerColor="bg-slate-900"
            onDelete={deleteNode}
            // Removed internal inputs/outputs management, now handled by instance rows
            className="w-[500px]"
        >
            <div className="flex flex-col">
                <div className="bg-indigo-900/30 p-1 flex justify-end border-b border-indigo-900/50">
                    <button 
                        onClick={(e) => { e.stopPropagation(); toggleMasterGeneration(); }} 
                        className={`flex items-center space-x-1 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors border ${globalGenerationAllowed ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30' : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'}`} 
                        title="Master AI Gate"
                    >
                        <Sparkles className="w-3 h-3" />
                        <span>{globalGenerationAllowed ? "AI Active" : "AI Muted"}</span>
                    </button>
                </div>

                <div className="flex flex-col">
                    {instances.map((instance) => (
                        <RemapperInstanceRow 
                            key={instance.index} 
                            instance={instance} 
                            confirmations={confirmations} 
                            toggleInstanceGeneration={toggleInstanceGeneration} 
                            handleConfirmGeneration={handleConfirmGeneration} 
                            handleImageLoad={handleImageLoad} 
                            isGeneratingPreview={isGeneratingPreview} 
                            displayPreviews={displayPreviews} 
                            payloadRegistry={payloadRegistry} 
                            id={id} 
                            localSetting={instanceSettings[instance.index]?.generationAllowed ?? true} 
                        />
                    ))}
                </div>
                
                <button 
                    onClick={() => setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, instanceCount: (n.data.instanceCount || 1) + 1 } } : n))} 
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 border-t border-slate-700 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center space-x-1"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <span className="text-[10px] font-medium uppercase tracking-wider">Add Remap Instance</span>
                </button>
            </div>
        </BaseNodeShell>
    );
});