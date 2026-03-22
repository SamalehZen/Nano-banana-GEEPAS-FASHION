'use client';

import { createContext, useContext, useReducer, useCallback, type ReactNode, type Dispatch } from 'react';

export type CanvasTool =
  | 'select' | 'hand'
  | 'pin' | 'ai-image' | 'grid'
  | 'rectangle' | 'line' | 'arrow' | 'ellipse' | 'polygon' | 'star'
  | 'pen' | 'text' | 'upload' | 'export';

export type ToolCategory = 'select' | 'pin' | 'ai-image' | 'grid' | 'shape' | 'pen' | 'text' | 'upload' | 'export';

export interface CanvasLayer {
  id: string;
  type: 'image' | 'shape' | 'text' | 'pen' | 'frame';
  name: string;
  visible: boolean;
  data?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectionRef {
  id: number;
  layerId: string;
  label: string;
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  activeTool: CanvasTool;
  toolCategory: ToolCategory;
  showLayerPanel: boolean;
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  selectionRefs: SelectionRef[];
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  textAlign: string;
  opacity: number;
}

export type CanvasAction =
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'ZOOM_IN' }
  | { type: 'ZOOM_OUT' }
  | { type: 'SET_PAN'; x: number; y: number }
  | { type: 'RESET_VIEW' }
  | { type: 'SET_TOOL'; tool: CanvasTool; category: ToolCategory }
  | { type: 'TOGGLE_LAYER_PANEL' }
  | { type: 'SET_SHOW_LAYER_PANEL'; show: boolean }
  | { type: 'ADD_LAYER'; layer: CanvasLayer }
  | { type: 'REMOVE_LAYER'; id: string }
  | { type: 'UPDATE_LAYER'; id: string; updates: Partial<CanvasLayer> }
  | { type: 'SELECT_LAYER'; id: string | null }
  | { type: 'TOGGLE_LAYER_VISIBILITY'; id: string }
  | { type: 'ADD_SELECTION_REF'; ref: SelectionRef }
  | { type: 'CLEAR_SELECTION_REFS' }
  | { type: 'SET_STROKE_COLOR'; color: string }
  | { type: 'SET_FILL_COLOR'; color: string }
  | { type: 'SET_STROKE_WIDTH'; width: number }
  | { type: 'SET_FONT_SIZE'; size: number }
  | { type: 'SET_FONT_FAMILY'; family: string }
  | { type: 'SET_FONT_WEIGHT'; weight: string }
  | { type: 'SET_TEXT_ALIGN'; align: string }
  | { type: 'SET_OPACITY'; opacity: number };

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 20;

function clampZoom(z: number): number {
  return Math.min(Math.max(z, MIN_ZOOM), MAX_ZOOM);
}

const initialState: CanvasState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  activeTool: 'select',
  toolCategory: 'select',
  showLayerPanel: false,
  layers: [],
  selectedLayerId: null,
  selectionRefs: [],
  strokeColor: '#000000',
  fillColor: '#000000',
  strokeWidth: 10,
  fontSize: 80,
  fontFamily: 'Inter',
  fontWeight: 'Regular',
  textAlign: 'left',
  opacity: 100,
};

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'SET_ZOOM':
      return { ...state, zoom: clampZoom(action.zoom) };
    case 'ZOOM_IN':
      return { ...state, zoom: clampZoom(state.zoom * 1.15) };
    case 'ZOOM_OUT':
      return { ...state, zoom: clampZoom(state.zoom / 1.15) };
    case 'SET_PAN':
      return { ...state, panX: action.x, panY: action.y };
    case 'RESET_VIEW':
      return { ...state, zoom: 1, panX: 0, panY: 0 };
    case 'SET_TOOL':
      return { ...state, activeTool: action.tool, toolCategory: action.category };
    case 'TOGGLE_LAYER_PANEL':
      return { ...state, showLayerPanel: !state.showLayerPanel };
    case 'SET_SHOW_LAYER_PANEL':
      return { ...state, showLayerPanel: action.show };
    case 'ADD_LAYER':
      return { ...state, layers: [...state.layers, action.layer] };
    case 'REMOVE_LAYER':
      return {
        ...state,
        layers: state.layers.filter(l => l.id !== action.id),
        selectedLayerId: state.selectedLayerId === action.id ? null : state.selectedLayerId,
      };
    case 'UPDATE_LAYER':
      return {
        ...state,
        layers: state.layers.map(l => l.id === action.id ? { ...l, ...action.updates } : l),
      };
    case 'SELECT_LAYER':
      return { ...state, selectedLayerId: action.id };
    case 'TOGGLE_LAYER_VISIBILITY':
      return {
        ...state,
        layers: state.layers.map(l => l.id === action.id ? { ...l, visible: !l.visible } : l),
      };
    case 'ADD_SELECTION_REF':
      return { ...state, selectionRefs: [...state.selectionRefs, action.ref] };
    case 'CLEAR_SELECTION_REFS':
      return { ...state, selectionRefs: [] };
    case 'SET_STROKE_COLOR':
      return { ...state, strokeColor: action.color };
    case 'SET_FILL_COLOR':
      return { ...state, fillColor: action.color };
    case 'SET_STROKE_WIDTH':
      return { ...state, strokeWidth: action.width };
    case 'SET_FONT_SIZE':
      return { ...state, fontSize: action.size };
    case 'SET_FONT_FAMILY':
      return { ...state, fontFamily: action.family };
    case 'SET_FONT_WEIGHT':
      return { ...state, fontWeight: action.weight };
    case 'SET_TEXT_ALIGN':
      return { ...state, textAlign: action.align };
    case 'SET_OPACITY':
      return { ...state, opacity: action.opacity };
    default:
      return state;
  }
}

interface CanvasContextType {
  state: CanvasState;
  dispatch: Dispatch<CanvasAction>;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(canvasReducer, initialState);
  return (
    <CanvasContext.Provider value={{ state, dispatch }}>
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas() {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error('useCanvas must be used within CanvasProvider');
  return ctx;
}

export function useCanvasActions() {
  const { dispatch } = useCanvas();

  return {
    setZoom: useCallback((zoom: number) => dispatch({ type: 'SET_ZOOM', zoom }), [dispatch]),
    zoomIn: useCallback(() => dispatch({ type: 'ZOOM_IN' }), [dispatch]),
    zoomOut: useCallback(() => dispatch({ type: 'ZOOM_OUT' }), [dispatch]),
    setPan: useCallback((x: number, y: number) => dispatch({ type: 'SET_PAN', x, y }), [dispatch]),
    resetView: useCallback(() => dispatch({ type: 'RESET_VIEW' }), [dispatch]),
    setTool: useCallback((tool: CanvasTool, category: ToolCategory) =>
      dispatch({ type: 'SET_TOOL', tool, category }), [dispatch]),
    toggleLayerPanel: useCallback(() => dispatch({ type: 'TOGGLE_LAYER_PANEL' }), [dispatch]),
    addLayer: useCallback((layer: CanvasLayer) => dispatch({ type: 'ADD_LAYER', layer }), [dispatch]),
    removeLayer: useCallback((id: string) => dispatch({ type: 'REMOVE_LAYER', id }), [dispatch]),
    selectLayer: useCallback((id: string | null) => dispatch({ type: 'SELECT_LAYER', id }), [dispatch]),
    toggleLayerVisibility: useCallback((id: string) =>
      dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', id }), [dispatch]),
    addSelectionRef: useCallback((ref: SelectionRef) =>
      dispatch({ type: 'ADD_SELECTION_REF', ref }), [dispatch]),
    clearSelectionRefs: useCallback(() => dispatch({ type: 'CLEAR_SELECTION_REFS' }), [dispatch]),
    setStrokeColor: useCallback((color: string) => dispatch({ type: 'SET_STROKE_COLOR', color }), [dispatch]),
    setFillColor: useCallback((color: string) => dispatch({ type: 'SET_FILL_COLOR', color }), [dispatch]),
    setStrokeWidth: useCallback((width: number) => dispatch({ type: 'SET_STROKE_WIDTH', width }), [dispatch]),
    setFontSize: useCallback((size: number) => dispatch({ type: 'SET_FONT_SIZE', size }), [dispatch]),
    setFontFamily: useCallback((family: string) => dispatch({ type: 'SET_FONT_FAMILY', family }), [dispatch]),
    setFontWeight: useCallback((weight: string) => dispatch({ type: 'SET_FONT_WEIGHT', weight }), [dispatch]),
    setTextAlign: useCallback((align: string) => dispatch({ type: 'SET_TEXT_ALIGN', align }), [dispatch]),
    setOpacity: useCallback((opacity: number) => dispatch({ type: 'SET_OPACITY', opacity }), [dispatch]),
  };
}
