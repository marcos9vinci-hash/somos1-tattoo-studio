import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Image as ImageIcon, 
  Zap, 
  Layers, 
  Maximize2, 
  Scissors, 
  ChevronRight, 
  ChevronLeft,
  RotateCcw, 
  Download,
  Loader2,
  Menu as MenuIcon,
  X,
  Sparkles,
  Send,
  Settings2,
  Plus,
  ChevronDown,
  ChevronUp,
  Accessibility,
  Hand,
  Footprints,
  User,
  LayoutGrid,
  Save,
  Bookmark,
  Trash2,
  CircleDashed,
  Pencil,
  Square,
  Smartphone,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Sticker,
  Sliders,
  Check,
  RefreshCw,
  Palette,
  Copy
} from 'lucide-react';
import { Stage, Layer, Line } from 'react-konva';
import { PROMPTS, STYLES, MOCKUPS } from './constants';
import { generateImage, analyzeImage } from './services/gemini';
import { AnimatedCircularProgressBar } from './components/AnimatedCircularProgressBar';
import { PencilLoader } from './components/PencilLoader';
import Dock from './components/Dock';

type AppState = 'idle' | 'uploaded' | 'processing' | 'result';
type SubMenu = 'none' | 'styles' | 'mockups';
type GeminiModel = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';

interface HistoryItem {
  id: string;
  type: 'image' | 'text';
  content: string;
  originalImage?: string;
  action: string;
}

interface ImageFile {
  data: string;
  mimeType: string;
}

interface CustomStyle {
  id: string;
  name: string;
  prompt: string;
  color: string;
}

const THEMES = [
  { id: 'dark-gold', name: 'Dark Gold', primary: '#D4AF37', secondary: '#000000', text: '#ffffff' },
  { id: 'cyberpunk', name: 'Cyberpunk', primary: '#00FF00', secondary: '#000000', text: '#ffffff' },
  { id: 'minimal-white', name: 'Minimal White', primary: '#3B82F6', secondary: '#FFFFFF', text: '#000000' },
  { id: 'deep-ocean', name: 'Deep Ocean', primary: '#0EA5E9', secondary: '#0F172A', text: '#ffffff' },
  { id: 'crimson-night', name: 'Crimson Night', primary: '#EF4444', secondary: '#111827', text: '#ffffff' },
];

const PREVIEW_BGS = [
  { name: 'Quadriculado Escuro', value: 'transparent-dark', class: 'bg-zinc-900' },
  { name: 'Quadriculado Médio', value: 'transparent', class: 'bg-zinc-700' },
  { name: 'Quadriculado Claro', value: 'transparent-light', class: 'bg-zinc-500' },
  { name: 'Branco', value: '#ffffff', class: 'bg-white' },
  { name: 'Preto', value: '#000000', class: 'bg-black' },
];

export default function App() {
  const [state, setState] = useState<AppState>('idle');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [resultType, setResultType] = useState<'image' | 'text'>('image');
  const [subMenu, setSubMenu] = useState<SubMenu>('none');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [selectedModel, setSelectedModel] = useState<GeminiModel>('gemini-2.5-flash-image');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [customStyles, setCustomStyles] = useState<CustomStyle[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newStyleName, setNewStyleName] = useState('');
  const [stylePreviews, setStylePreviews] = useState<Record<string, string>>({});
  const [appBackground, setAppBackground] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "9:16">("9:16");
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [stickerMode, setStickerMode] = useState<'none' | 'trace' | 'sticker'>('none');
  const [stickerIntensity, setStickerIntensity] = useState(0.8);
  const [processedSticker, setProcessedSticker] = useState<string | null>(null);
  const [isProcessingSticker, setIsProcessingSticker] = useState(false);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [previewBgColor, setPreviewBgColor] = useState('transparent');
  const [appTheme, setAppTheme] = useState('dark-gold');
  const [appPrimaryColor, setAppPrimaryColor] = useState('#D4AF37');
  const [appSecondaryColor, setAppSecondaryColor] = useState('#000000');
  const [isTraceSettingsCollapsed, setIsTraceSettingsCollapsed] = useState(false);
  const [showPromptView, setShowPromptView] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCommandExpanded, setIsCommandExpanded] = useState(true);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [lines, setLines] = useState<any[]>([]);
  const isDrawing = useRef(false);
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (containerRef.current) {
      const updateSize = () => {
        if (containerRef.current) {
          setStageSize({
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight
          });
        }
      };
      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, [isAnnotating]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAppBackground(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('tattoo_app_theme');
    if (savedTheme) setAppTheme(savedTheme);
    const savedPrimary = localStorage.getItem('tattoo_app_primary');
    if (savedPrimary) setAppPrimaryColor(savedPrimary);
    const savedSecondary = localStorage.getItem('tattoo_app_secondary');
    if (savedSecondary) setAppSecondaryColor(savedSecondary);
    const savedBg = localStorage.getItem('tattoo_preview_bg');
    if (savedBg) setPreviewBgColor(savedBg);
    const savedIntensity = localStorage.getItem('tattoo_sticker_intensity');
    if (savedIntensity) setStickerIntensity(parseFloat(savedIntensity));
    const savedMode = localStorage.getItem('tattoo_sticker_mode');
    if (savedMode && (savedMode === 'sticker' || savedMode === 'trace')) setStickerMode(savedMode as any);
  }, []);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const theme = THEMES.find(t => t.id === appTheme);
    if (appTheme === 'custom') {
      document.documentElement.style.setProperty('--accent', appPrimaryColor);
      document.documentElement.style.setProperty('--bg-app', appSecondaryColor);
      document.documentElement.style.setProperty('--text-app', '#ffffff');
    } else if (theme) {
      document.documentElement.style.setProperty('--accent', theme.primary);
      document.documentElement.style.setProperty('--bg-app', theme.secondary);
      document.documentElement.style.setProperty('--text-app', theme.text);
      // Only update state if different to avoid unnecessary re-renders
      if (appPrimaryColor !== theme.primary) setAppPrimaryColor(theme.primary);
      if (appSecondaryColor !== theme.secondary) setAppSecondaryColor(theme.secondary);
    }

    // Debounce localStorage updates
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem('tattoo_app_theme', appTheme);
      localStorage.setItem('tattoo_app_primary', appPrimaryColor);
      localStorage.setItem('tattoo_app_secondary', appSecondaryColor);
    }, 500);
  }, [appTheme, appPrimaryColor, appSecondaryColor]);

  useEffect(() => {
    localStorage.setItem('tattoo_preview_bg', previewBgColor);
  }, [previewBgColor]);

  useEffect(() => {
    localStorage.setItem('tattoo_sticker_intensity', stickerIntensity.toString());
  }, [stickerIntensity]);

  useEffect(() => {
    if (stickerMode !== 'none') {
      localStorage.setItem('tattoo_sticker_mode', stickerMode);
    }
  }, [stickerMode]);

  useEffect(() => {
    // Load history from API
    fetch('/api/history')
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(err => console.error('Failed to load history', err));

    // Load styles from API
    fetch('/api/styles')
      .then(res => res.json())
      .then(data => setCustomStyles(data))
      .catch(err => console.error('Failed to load styles', err));

    const savedPreviews = localStorage.getItem('tattoo_style_previews');
    if (savedPreviews) {
      try {
        setStylePreviews(JSON.parse(savedPreviews));
      } catch (e) {
        console.error('Failed to parse style previews', e);
      }
    }

    const savedBg = localStorage.getItem('tattoo_app_background');
    if (savedBg) {
      setAppBackground(savedBg);
    }
  }, []);

  const processStickerImage = useCallback(() => {
    const sourceImage = result || images[selectedImageIndex]?.data;
    if (!sourceImage || !canvasRef.current || stickerMode === 'none') {
      setProcessedSticker(null);
      return;
    }

    // Debounce processing to avoid freezing on rapid slider moves
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    processingTimeoutRef.current = setTimeout(() => {
      setIsProcessingSticker(true);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        
        const w = img.width;
        const h = img.height;
        
        // Use upscale factor for better quality as in the snippet
        const upscaleFactor = 2;
        canvas.width = w * upscaleFactor;
        canvas.height = h * upscaleFactor;
        
        if (stickerMode === 'trace') {
          ctx.filter = 'grayscale(100%)';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = imageData.data;

          // Optimization: Pre-calculate Math.pow lookup table
          const lookupTable = new Uint8ClampedArray(256);
          for (let i = 0; i < 256; i++) {
            lookupTable[i] = Math.pow(i / 255, stickerIntensity) * 255;
          }

          for (let i = 0; i < pixels.length; i += 4) {
            const brightness = pixels[i]; // After grayscale filter, R=G=B
            const inverted = 255 - brightness;
            const alpha = lookupTable[inverted];
            pixels[i] = 0; pixels[i+1] = 0; pixels[i+2] = 0;
            pixels[i+3] = alpha;
          }
          ctx.filter = 'none';
          ctx.putImageData(imageData, 0, 0);

          // Scale back to original size
          const finalCanvas = document.createElement('canvas');
          finalCanvas.width = w;
          finalCanvas.height = h;
          const finalCtx = finalCanvas.getContext('2d')!;
          finalCtx.drawImage(canvas, 0, 0, w, h);
          setProcessedSticker(finalCanvas.toDataURL('image/png'));
        } else {
          // Sticker mode logic (remains similar but adapted for upscale if needed, 
          // but let's keep it simple for now or adapt it)
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, w, h);
          const pixels = imageData.data;

          const maskCanvas = document.createElement('canvas');
          maskCanvas.width = w;
          maskCanvas.height = h;
          const mCtx = maskCanvas.getContext('2d')!;
          
          const maskData = mCtx.createImageData(w, h);
          for (let i = 0; i < pixels.length; i += 4) {
            const brightness = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
            const val = brightness < 180 ? 255 : 0; 
            maskData.data[i] = 255;
            maskData.data[i+1] = 255;
            maskData.data[i+2] = 255;
            maskData.data[i+3] = val;
          }
          mCtx.putImageData(maskData, 0, 0);

          const strokeCanvas = document.createElement('canvas');
          strokeCanvas.width = w;
          strokeCanvas.height = h;
          const sCtx = strokeCanvas.getContext('2d')!;
          
          const expansion = 12; 
          sCtx.shadowColor = "white";
          sCtx.shadowBlur = expansion;
          
          for(let radius = 0; radius < expansion; radius += 2) {
             sCtx.drawImage(maskCanvas, 0, 0);
             sCtx.strokeStyle = "white";
             sCtx.lineWidth = radius * 2;
             sCtx.strokeRect(0,0,0,0);
          }
          
          sCtx.globalCompositeOperation = 'source-over';
          sCtx.fillStyle = "white";
          for(let i=0; i<8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            sCtx.drawImage(maskCanvas, Math.cos(angle)*expansion, Math.sin(angle)*expansion);
          }

          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(strokeCanvas, 0, 0);
          
          const topTraceCanvas = document.createElement('canvas');
          topTraceCanvas.width = w;
          topTraceCanvas.height = h;
          const tCtx = topTraceCanvas.getContext('2d')!;
          tCtx.drawImage(img, 0, 0);
          const tData = tCtx.getImageData(0,0,w,h);
          for (let i = 0; i < tData.data.length; i += 4) {
            const b = (tData.data[i] + tData.data[i+1] + tData.data[i+2]) / 3;
            tData.data[i] = 0; tData.data[i+1] = 0; tData.data[i+2] = 0;
            tData.data[i+3] = b < 200 ? 255 : 0;
          }
          tCtx.putImageData(tData, 0, 0);
          ctx.drawImage(topTraceCanvas, 0, 0);
          setProcessedSticker(canvas.toDataURL('image/png'));
        }
        
        setIsProcessingSticker(false);
      };
      img.src = sourceImage;
    }, 50); // 50ms debounce
  }, [result, images, selectedImageIndex, stickerMode, stickerIntensity]);

  useEffect(() => {
    processStickerImage();
  }, [processStickerImage]);


  useEffect(() => {
    localStorage.setItem('tattoo_style_previews', JSON.stringify(stylePreviews));
  }, [stylePreviews]);

  useEffect(() => {
    if (appBackground) {
      localStorage.setItem('tattoo_app_background', appBackground);
    } else {
      localStorage.removeItem('tattoo_app_background');
    }
  }, [appBackground]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isAdditional: boolean = false) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const readers = files.map(file => {
        return new Promise<{data: string, mimeType: string}>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              data: event.target?.result as string,
              mimeType: file.type
            });
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then(newImages => {
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
        if (isAdditional || state !== 'idle') {
          setImages(prev => [...prev, ...newImages]);
          if (state === 'idle') setState('uploaded');
        } else {
          setImages(newImages);
          setState('uploaded');
        }
      });
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      const readers = imageFiles.map(file => {
        return new Promise<{data: string, mimeType: string}>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              data: event.target?.result as string,
              mimeType: file.type
            });
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then(newImages => {
        setRotation(0);
        setFlipH(false);
        setFlipV(false);
        setImages(prev => [...prev, ...newImages]);
        setState('uploaded');
      });
    }
  }, []);

  const reset = () => {
    setState('idle');
    setImages([]);
    setResult(null);
    setSubMenu('none');
    setCustomCommand('');
  };

  const addToHistory = async (content: string, type: 'image' | 'text', action: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      type,
      content,
      originalImage: images[selectedImageIndex]?.data,
      action
    };
    
    setHistory(prev => [newItem, ...prev]);

    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
    } catch (err) {
      console.error('Failed to save history item', err);
    }
  };

  const checkApiKey = async () => {
    if (selectedModel === 'gemini-3-pro-image-preview') {
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        return false;
      }
    }
    return true;
  };

  const runAction = async (action: string, prompt: string, isText: boolean = false) => {
    if (images.length === 0) return;
    
    const canProceed = await checkApiKey();
    if (!canProceed) return;

    setState('processing');
    setLoadingMessage(`Processando: ${action}...`);
    setLoadingProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 95) return prev;
        return prev + (95 - prev) * 0.1;
      });
    }, 500);
    
    try {
      // Use result as the active image if it exists and is an image, 
      // especially for modifications or technical actions on generated content
      let activeImageData = images[selectedImageIndex]?.data;
      let activeMimeType = images[selectedImageIndex]?.mimeType;

      if (result && resultType === 'image') {
        activeImageData = result;
        activeMimeType = 'image/png';
      }

      if (!activeImageData) return;

      const additionalImages = images.filter((_, i) => i !== selectedImageIndex);
      
      const imageParts = [
        { data: activeImageData.split(',')[1], mimeType: activeMimeType },
        ...additionalImages.map(img => ({
          data: img.data.split(',')[1],
          mimeType: img.mimeType
        }))
      ];

      // If there are annotations, capture them and add as a separate image part
      if (lines.length > 0 && stageRef.current) {
        const annotationData = stageRef.current.toDataURL();
        imageParts.push({
          data: annotationData.split(',')[1],
          mimeType: 'image/png'
        });
      }

      const finalPrompt = customCommand 
        ? `${prompt}\n\nUSER CUSTOM INSTRUCTION: ${customCommand}${lines.length > 0 ? '\nNote: The user has provided an annotation layer on the image. Please use the orange markings as a reference for the requested changes.' : ''}`
        : prompt;

      setCurrentPrompt(finalPrompt);

      let output: string;
      
      if (isText) {
        output = await analyzeImage(finalPrompt, imageParts[0].data, imageParts[0].mimeType);
        setResultType('text');
      } else {
        output = await generateImage(finalPrompt, imageParts, selectedModel, aspectRatio);
        setResultType('image');
      }
      
      setLoadingProgress(100);
      setTimeout(() => {
        setResult(output);
        if (isText) setShowPromptView(true);
        addToHistory(output, isText ? 'text' : 'image', action);
        setState('result');
        setCustomCommand('');
        setLines([]);
        setIsAnnotating(false);
        clearInterval(progressInterval);
      }, 500);
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error(error);
      if (error.message?.includes("Requested entity was not found")) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      } else {
        alert('Erro ao processar imagem. Verifique sua conexão e tente novamente.');
      }
      setState('uploaded');
    }
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCommand.trim() || state === 'idle' || state === 'processing') return;
    runAction('Comando Personalizado', customCommand);
  };

  const saveCustomStyle = async () => {
    if (!newStyleName.trim() || !currentPrompt) return;
    
    const newStyle: CustomStyle = {
      id: Date.now().toString(),
      name: newStyleName,
      prompt: currentPrompt,
      color: 'from-purple-500 to-indigo-500'
    };
    
    setCustomStyles(prev => [newStyle, ...prev]);
    setNewStyleName('');
    setShowSaveModal(false);

    try {
      await fetch('/api/styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStyle)
      });
      alert('Estilo salvo com sucesso!');
    } catch (err) {
      console.error('Failed to save style', err);
      alert('Erro ao salvar estilo no servidor.');
    }
  };

  const deleteCustomStyle = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este estilo?')) {
      setCustomStyles(prev => prev.filter(s => s.id !== id));
      try {
        await fetch(`/api/styles/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Failed to delete style', err);
      }
    }
  };

  const dockItems = [
    {
      icon: <Upload className="w-5 h-5 text-accent" />,
      label: 'Upload de Imagem',
      onClick: () => fileInputRef.current?.click()
    },
    {
      icon: <Scissors className="w-5 h-5 text-accent" />,
      label: 'Extrair Desenho',
      onClick: () => runAction('Extrair Desenho', PROMPTS.EXTRACT_DRAWING)
    },
    {
      icon: <ImageIcon className="w-5 h-5 text-accent" />,
      label: 'Extrair Estilo',
      onClick: () => runAction('Extrair Estilo', PROMPTS.EXTRACT_STYLE, true)
    },
    {
      icon: <CircleDashed className="w-5 h-5 text-accent" />,
      label: 'Decalque Técnico',
      onClick: () => runAction('Decalque Técnico', PROMPTS.TECHNICAL_DECAL)
    },
    {
      icon: <Layers className="w-5 h-5 text-accent" />,
      label: 'Mudar Estilo',
      onClick: () => setSubMenu('styles')
    },
    {
      icon: <LayoutGrid className="w-5 h-5 text-accent" />,
      label: 'Fazer Mockup',
      onClick: () => setSubMenu('mockups')
    },
    {
      icon: <Maximize2 className="w-5 h-5 text-accent" />,
      label: 'Melhorar Qualidade',
      onClick: () => runAction('Melhorar Qualidade', PROMPTS.IMPROVE_QUALITY)
    },
    {
      icon: <Settings2 className="w-5 h-5 text-white/60" />,
      label: 'Configurações',
      onClick: () => setShowSettings(!showSettings)
    },
    {
      icon: <RotateCcw className="w-5 h-5 text-red-400" />,
      label: 'Resetar App',
      onClick: reset
    }
  ];

  return (
    <div className="w-full h-full flex-1 flex flex-col bg-bg text-white font-sans selection:bg-accent selection:text-white relative overflow-hidden">
      {/* App Background */}
      {appBackground && (
        <div 
          className="fixed inset-0 z-0 opacity-20 pointer-events-none bg-cover bg-center bg-no-reflex"
          style={{ backgroundImage: `url(${appBackground})` }}
        />
      )}
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 right-6 z-40 w-72 bg-zinc-900 rounded-2xl p-4 shadow-2xl border border-zinc-800 max-h-[80vh] overflow-y-auto no-scrollbar"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-mono text-white/40 uppercase tracking-widest">Configurações</h4>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setSelectedModel('gemini-2.5-flash-image')}
                className={`text-left p-3 rounded-xl transition-all text-sm flex items-center justify-between ${selectedModel === 'gemini-2.5-flash-image' ? 'bg-accent text-white' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}
              >
                <span>Gemini Basic</span>
                {selectedModel === 'gemini-2.5-flash-image' && <Zap className="w-3 h-3 fill-current" />}
              </button>
              <button
                onClick={() => setSelectedModel('gemini-3-pro-image-preview')}
                className={`text-left p-3 rounded-xl transition-all text-sm flex items-center justify-between ${selectedModel === 'gemini-3-pro-image-preview' ? 'bg-accent text-white' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}
              >
                <span>Gemini Pro</span>
                {selectedModel === 'gemini-3-pro-image-preview' && <Sparkles className="w-3 h-3 fill-current" />}
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <h4 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-4">Paleta de Cores do App</h4>
              <div className="grid grid-cols-6 gap-2">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setAppTheme(theme.id)}
                    className={`h-8 rounded-lg border-2 transition-all flex items-center justify-center ${appTheme === theme.id ? 'border-accent scale-110' : 'border-transparent hover:border-white/10'}`}
                    style={{ backgroundColor: theme.secondary }}
                    title={theme.name}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.primary }} />
                  </button>
                ))}
                <button
                  onClick={() => setAppTheme('custom')}
                  className={`h-8 rounded-lg border-2 transition-all flex items-center justify-center bg-gradient-to-br from-red-500 via-green-500 to-blue-500 ${appTheme === 'custom' ? 'border-accent scale-110' : 'border-transparent hover:border-white/10'}`}
                  title="Cor Personalizada"
                >
                  <Palette className="w-4 h-4 text-white" />
                </button>
              </div>
              
              {appTheme === 'custom' && (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Cor Principal</span>
                    <input 
                      type="color" 
                      value={appPrimaryColor}
                      onChange={(e) => setAppPrimaryColor(e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer"
                    />
                  </div>
                  <div className="items-center justify-between flex">
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Cor de Fundo</span>
                    <input 
                      type="color" 
                      value={appSecondaryColor}
                      onChange={(e) => setAppSecondaryColor(e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-white/10">
              <h4 className="text-xs font-mono text-white/40 uppercase tracking-widest mb-4">Fundo Personalizado</h4>
              <div className="flex flex-col gap-2">
                <input 
                  type="file" 
                  ref={backgroundInputRef} 
                  onChange={handleBackgroundUpload} 
                  className="hidden" 
                  accept="image/*" 
                />
                <button
                  onClick={() => backgroundInputRef.current?.click()}
                  className="w-full btn-secondary flex items-center justify-center gap-2 text-xs py-3"
                >
                  <ImageIcon className="w-4 h-4" />
                  Alterar Fundo
                </button>
                {appBackground && (
                  <button
                    onClick={() => setAppBackground(null)}
                    className="w-full py-2 text-[10px] text-red-400 hover:text-red-300 transition-colors"
                  >
                    Remover Fundo
                  </button>
                )}
              </div>
            </div>

            <p className="mt-4 text-[10px] text-white/30 leading-tight">
              O modelo Pro requer uma chave de API paga do Google Cloud.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Style Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 60 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-zinc-900 rounded-3xl p-8 border border-zinc-800 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Salvar Novo Estilo</h3>
                <button 
                  onClick={() => setShowSaveModal(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Nome do Estilo</label>
                  <input 
                    type="text" 
                    value={newStyleName}
                    onChange={(e) => setNewStyleName(e.target.value)}
                    placeholder="Ex: Realismo Sombrio, Neo-Tradicional..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
                    autoFocus
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono text-white/40 uppercase tracking-widest">Prompt Base</label>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 max-h-32 overflow-y-auto">
                    <p className="text-[10px] font-mono text-white/40 leading-relaxed">
                      {currentPrompt}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button 
                    onClick={() => setShowSaveModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={saveCustomStyle}
                    disabled={!newStyleName.trim()}
                    className="flex-1 bg-accent text-white rounded-xl font-bold hover:bg-opacity-90 transition-all disabled:opacity-50"
                  >
                    Salvar Estilo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col items-center overflow-hidden relative w-full">
        {/* Main Content Area */}
        <div className="w-full max-w-5xl p-4 md:p-6 flex-1 flex flex-col gap-6 overflow-y-auto pb-32 no-scrollbar">
          <AnimatePresence mode="wait">
            {state === 'idle' ? (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 flex flex-col items-center justify-center min-h-[350px] my-auto"
              >
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-8 shadow-2xl cursor-pointer hover:bg-zinc-800 transition-colors group"
                >
                  <Zap className="w-16 h-16 text-accent animate-pulse group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-white/40 text-center max-w-sm leading-relaxed">
                  Sua ferramenta de inteligência artificial para automação e criação de tatuagens.
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => handleFileUpload(e)} 
                  className="hidden" 
                  accept="image/*" 
                  multiple
                />
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="flex flex-col gap-6 h-full">
                  {/* Result Area - Now Primary */}
                  <div className="flex flex-col gap-3 flex-1 min-h-0">
                    <div className="flex items-center justify-between px-2 min-h-[24px]">
                    </div>
                    <div className={`flex-1 rounded-3xl overflow-hidden border border-zinc-800 bg-black/40 relative flex items-center justify-center shadow-2xl transition-all duration-500 ease-in-out ${aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[9/16]'} max-h-[75vh] mx-auto w-full`}>
                      {state === 'processing' ? (
                        <div className="flex flex-col items-center gap-6 p-8 text-center">
                          <PencilLoader />
                          <div className="flex flex-col gap-2">
                            <p className="text-lg font-bold text-white animate-pulse">{loadingMessage}</p>
                            <p className="text-xs text-white/40 font-mono uppercase tracking-widest">Aguarde a geração da IA</p>
                          </div>
                        </div>
                      ) : (result || (state === 'uploaded' && images.length > 0)) ? (
                        (resultType === 'image' || (state === 'uploaded' && !result)) ? (
                          <div 
                            className="relative w-full h-full flex items-center justify-center overflow-hidden" 
                            ref={containerRef}
                            style={{ 
                              backgroundColor: previewBgColor.startsWith('transparent') ? 'transparent' : previewBgColor,
                              backgroundImage: previewBgColor.startsWith('transparent') ? 
                                `linear-gradient(45deg, ${previewBgColor === 'transparent-light' ? '#333' : (previewBgColor === 'transparent-dark' ? '#050505' : '#1a1a1a')} 25%, transparent 25%), linear-gradient(-45deg, ${previewBgColor === 'transparent-light' ? '#333' : (previewBgColor === 'transparent-dark' ? '#050505' : '#1a1a1a')} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${previewBgColor === 'transparent-light' ? '#333' : (previewBgColor === 'transparent-dark' ? '#050505' : '#1a1a1a')} 75%), linear-gradient(-45deg, transparent 75%, ${previewBgColor === 'transparent-light' ? '#333' : (previewBgColor === 'transparent-dark' ? '#050505' : '#1a1a1a')} 75%)` 
                                : 'none',
                              backgroundSize: '20px 20px',
                              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                            }}
                          >
                            <img 
                              src={processedSticker || (resultType === 'image' ? result : null) || images[selectedImageIndex]?.data} 
                              alt="Result" 
                              className={`max-w-full max-h-full object-contain transition-all duration-300 ${isProcessingSticker ? 'opacity-50 blur-sm' : 'opacity-100'}`}
                              style={{ 
                                transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})` 
                              }}
                            />
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 z-20 w-full max-w-md px-4">
                              {/* Intensity Bar - Centralized above functions */}
                              <AnimatePresence>
                                {stickerMode !== 'none' && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                    className="p-3 bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-[260px]"
                                  >
                                    <div className="flex flex-col gap-3">
                                      <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                          <Sliders className="w-3 h-3 text-accent" />
                                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">TRAÇO</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <button 
                                            onClick={() => setIsTraceSettingsCollapsed(!isTraceSettingsCollapsed)}
                                            className="p-1 hover:bg-white/10 rounded-full transition-colors bg-white/5"
                                            title={isTraceSettingsCollapsed ? "Expandir" : "Recolher"}
                                          >
                                            {isTraceSettingsCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                          </button>
                                          <button 
                                            onClick={() => setStickerMode('none')}
                                            className="p-1 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-full transition-colors"
                                            title="Fechar"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                      
                                      <AnimatePresence>
                                        {!isTraceSettingsCollapsed && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden flex flex-col gap-3"
                                          >
                                            <div className="flex justify-between items-center">
                                              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Intensidade</span>
                                              <span className="text-[9px] font-mono text-zinc-950 bg-accent px-1.5 py-0.5 rounded-full font-bold">{stickerIntensity.toFixed(1)}</span>
                                            </div>
                                            <input 
                                              type="range" min="0.2" max="2.5" step="0.1" 
                                              value={stickerIntensity}
                                              onChange={(e) => setStickerIntensity(parseFloat(e.target.value))}
                                              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                                            />
                                            
                                            <div className="flex flex-col gap-2">
                                              <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Fundo do Preview</span>
                                              <div className="grid grid-cols-6 gap-2">
                                                {PREVIEW_BGS.map((bg) => (
                                                  <button
                                                    key={bg.value}
                                                    onClick={() => setPreviewBgColor(bg.value)}
                                                    className={`h-6 w-6 rounded-full border transition-all ${bg.class} ${previewBgColor === bg.value ? 'border-accent scale-110 shadow-lg' : 'border-white/5 hover:border-white/20'}`}
                                                    title={bg.name}
                                                  >
                                                    {bg.value.startsWith('transparent') && (
                                                      <div className="w-full h-full opacity-20 rounded-full" style={{ backgroundImage: 'linear-gradient(45deg, #fff 25%, transparent 25%), linear-gradient(-45deg, #fff 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #fff 75%), linear-gradient(-45deg, transparent 75%, #fff 75%)', backgroundSize: '4px 4px' }} />
                                                    )}
                                                  </button>
                                                ))}
                                                <div className="relative h-6 w-6">
                                                  <input 
                                                    type="color" 
                                                    value={previewBgColor.startsWith('#') ? previewBgColor : '#ffffff'}
                                                    onChange={(e) => setPreviewBgColor(e.target.value)}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                  />
                                                  <button className={`h-6 w-6 rounded-full border border-white/10 flex items-center justify-center bg-zinc-800 transition-all ${previewBgColor.startsWith('#') && !PREVIEW_BGS.some(b => b.value === previewBgColor) ? 'border-accent scale-110' : ''}`}>
                                                    <Palette className="w-3 h-3 text-white/60" />
                                                  </button>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                                              <button 
                                                onClick={() => setStickerMode('sticker')}
                                                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all ${stickerMode === 'sticker' ? 'bg-accent text-zinc-950 shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                                              >
                                                STICKER
                                              </button>
                                              <button 
                                                onClick={() => setStickerMode('trace')}
                                                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all ${stickerMode === 'trace' ? 'bg-accent text-zinc-950 shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                                              >
                                                TRAÇO
                                              </button>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              <div className="flex items-center gap-1 px-2 py-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
                                <button 
                                  onClick={() => setStickerMode(prev => prev === 'none' ? 'trace' : 'none')}
                                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${stickerMode !== 'none' ? 'bg-accent text-zinc-950 shadow-lg shadow-accent/20' : 'text-white/70 hover:bg-white/10'}`}
                                  title="Configurações de Traço"
                                >
                                  <Sliders className="w-5 h-5" />
                                </button>

                                <button 
                                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                                  className="w-10 h-10 rounded-full text-white/70 hover:bg-white/10 flex items-center justify-center transition-all"
                                  title="Girar 90°"
                                >
                                  <RotateCw className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => setFlipH(prev => !prev)}
                                  className="w-10 h-10 rounded-full text-white/70 hover:bg-white/10 flex items-center justify-center transition-all"
                                  title="Inverter Horizontal"
                                >
                                  <FlipHorizontal className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => setFlipV(prev => !prev)}
                                  className="w-10 h-10 rounded-full text-white/70 hover:bg-white/10 flex items-center justify-center transition-all"
                                  title="Inverter Vertical"
                                >
                                  <FlipVertical className="w-5 h-5" />
                                </button>
                                
                                <button 
                                  onClick={() => setAspectRatio(prev => prev === "1:1" ? "9:16" : "1:1")}
                                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${aspectRatio === '9:16' ? 'text-accent' : 'text-white/70 hover:bg-white/10'}`}
                                  title={aspectRatio === "1:1" ? "Mudar para Vertical" : "Mudar para Quadrado"}
                                >
                                  {aspectRatio === "1:1" ? <Square className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                                </button>

                                <a 
                                  href={processedSticker || result || images[selectedImageIndex]?.data} 
                                  download="tattoo-engine-result.png"
                                  className="w-10 h-10 rounded-full text-white/70 hover:bg-white/10 flex items-center justify-center transition-all"
                                  title="Download"
                                >
                                  <Download className="w-5 h-5" />
                                </a>

                                {(result || images.length > 0) && (
                                  <button 
                                    onClick={() => runAction('Extrair Prompt', PROMPTS.EXTRACT_CONTENT, true)}
                                    className="w-10 h-10 rounded-full text-white/70 hover:bg-accent/20 hover:text-accent flex items-center justify-center transition-all"
                                    title="Extrair Prompt da Imagem (Conteúdo)"
                                  >
                                    <Zap className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {isAnnotating && (
                              <div className="absolute inset-0 z-10 cursor-crosshair">
                                <Stage
                                  width={stageSize.width}
                                  height={stageSize.height}
                                  onMouseDown={(e) => {
                                    isDrawing.current = true;
                                    const pos = e.target.getStage()?.getPointerPosition();
                                    if (pos) {
                                      setLines([...lines, { points: [pos.x, pos.y] }]);
                                    }
                                  }}
                                  onMouseMove={(e) => {
                                    if (!isDrawing.current) return;
                                    const stage = e.target.getStage();
                                    const point = stage?.getPointerPosition();
                                    if (point) {
                                      let lastLine = lines[lines.length - 1];
                                      lastLine.points = lastLine.points.concat([point.x, point.y]);
                                      lines.splice(lines.length - 1, 1, lastLine);
                                      setLines(lines.concat());
                                    }
                                  }}
                                  onMouseUp={() => {
                                    isDrawing.current = false;
                                  }}
                                  ref={stageRef}
                                  className="w-full h-full"
                                >
                                  <Layer>
                                    {lines.map((line, i) => (
                                      <Line
                                        key={i}
                                        points={line.points}
                                        stroke="#ff4e00"
                                        strokeWidth={3}
                                        tension={0.5}
                                        lineCap="round"
                                        lineJoin="round"
                                      />
                                    ))}
                                  </Layer>
                                </Stage>
                                <div className="absolute top-4 right-4 flex gap-2 z-30">
                                  <button 
                                    onClick={() => setLines([])}
                                    className="bg-zinc-900/90 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-medium text-white/60 hover:text-white transition-colors"
                                  >
                                    Limpar
                                  </button>
                                  <button 
                                    onClick={() => setIsAnnotating(false)}
                                    className="bg-accent px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg shadow-accent/20 transition-transform active:scale-95"
                                  >
                                    Pronto
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-6 overflow-y-auto h-full w-full">
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                              <pre className="whitespace-pre-wrap font-mono text-sm text-white/80 leading-relaxed">
                                {result}
                              </pre>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(result);
                                  alert('Copiado para a área de transferência!');
                                }}
                                className="mt-4 btn-secondary w-full text-xs"
                              >
                                Copiar Prompt
                              </button>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="text-white/20 flex flex-col items-center gap-2">
                          <Sparkles className="w-12 h-12 opacity-20" />
                          <p className="text-sm">Selecione uma ação para gerar</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History Section removed from here */}
        </div>
      </main>

      {/* Gemini-style Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-40 flex flex-col items-center pointer-events-none">
        <div className="w-full max-w-3xl pointer-events-auto relative">
          {/* Action Menu Popup */}
          <AnimatePresence>
            {showActionMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-0 mb-4 w-64 bg-zinc-900 rounded-2xl p-1 shadow-2xl border border-zinc-800 z-[60]"
              >
                <div className="flex flex-col gap-0.5">
                  {dockItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        item.onClick();
                        setShowActionMenu(false);
                      }}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-800 transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                        {item.icon}
                      </div>
                      <span className="text-sm font-medium text-white/80 group-hover:text-white">{item.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Command Bar */}
          <motion.div 
            layout
            className="bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden p-2 w-full"
          >
            <div className={`flex flex-col ${history.length > 0 || images.length > 0 ? 'gap-2' : 'gap-0'} w-full`}>
              {/* History & Images Row */}
              {(history.length > 0 || images.length > 0) && (
                <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-1">
                {/* History Items (Small) */}
                {history.length > 0 && (
                  <div className="flex gap-2 border-r border-zinc-800 pr-4 shrink-0">
                    {history.slice(0, 10).map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setResult(item.content);
                          setResultType(item.type);
                          setImages([{ data: item.originalImage || '', mimeType: 'image/png' }]);
                          setState('result');
                        }}
                        className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-800 bg-black shrink-0 hover:border-accent/50 transition-all"
                      >
                        {item.type === 'image' ? (
                          <img src={item.content} className="w-full h-full object-cover opacity-60" />
                        ) : (
                          <Zap className="w-full h-full p-2 text-accent/40" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Image Thumbnails (Inside Bar) */}
                {images.length > 0 && (
                  <div className="flex gap-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative shrink-0 group">
                        <div 
                          onClick={() => {
                            setSelectedImageIndex(idx);
                            setResult(null);
                            setRotation(0);
                            setFlipH(false);
                            setFlipV(false);
                          }}
                          className={`w-16 h-16 rounded-xl overflow-hidden border transition-all cursor-pointer bg-black ${selectedImageIndex === idx && !result ? 'border-accent shadow-lg shadow-accent/20' : 'border-zinc-800'}`}
                        >
                          <img src={img.data} className="w-full h-full object-cover" />
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const newImages = images.filter((_, i) => i !== idx);
                            setImages(newImages);
                            if (newImages.length === 0) setState('idle');
                            if (selectedImageIndex >= newImages.length) setSelectedImageIndex(Math.max(0, newImages.length - 1));
                          }}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-zinc-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActionMenu(!showActionMenu);
                  }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showActionMenu ? 'bg-accent text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-white/40'}`}
                >
                  <Plus className={`w-5 h-5 transition-transform duration-300 ${showActionMenu ? 'rotate-45' : ''}`} />
                </button>

                {(state === 'uploaded' || state === 'result') && (
                  <button 
                    onClick={() => setIsAnnotating(!isAnnotating)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isAnnotating ? 'bg-accent text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-white/40'}`}
                    title="Anotar na imagem"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                )}

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCommandSubmit(e);
                  }}
                  className="flex-1 flex items-center gap-2"
                >
                  <textarea 
                    value={customCommand}
                    onChange={(e) => setCustomCommand(e.target.value)}
                    placeholder="Descreva modificações..."
                    rows={1}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-white/20 resize-none py-1 no-scrollbar text-center"
                    disabled={state === 'processing'}
                  />
                  <div className="flex flex-col gap-2">
                    <button 
                      type="submit"
                      disabled={!customCommand.trim() || state === 'processing'}
                      className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center hover:bg-opacity-90 transition-all disabled:opacity-20 shadow-lg shadow-accent/20 shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Sub-menus Overlay (Centered) */}
      <AnimatePresence>
        {subMenu !== 'none' && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl max-h-[80vh] bg-zinc-900 rounded-3xl flex flex-col shadow-2xl border border-zinc-800 overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSubMenu('none')}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-sm font-mono text-white/40 uppercase tracking-widest">
                    {subMenu === 'styles' ? 'Mudar Estilo' : 'Fazer Mockup'}
                  </h3>
                </div>
                <button 
                  onClick={() => setSubMenu('none')}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                {subMenu === 'styles' ? (
                  <div className="flex flex-col gap-6">
                    {customStyles.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <h4 className="text-[9px] font-mono text-white/20 uppercase tracking-widest">Meus Estilos</h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {customStyles.map(style => (
                            <div key={style.id} className="relative group">
                              <button
                                onClick={() => {
                                  runAction(`Meu Estilo: ${style.name}`, style.prompt);
                                  setSubMenu('none');
                                }}
                                className="w-full flex flex-col gap-2 p-2 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all text-left"
                              >
                                <div className={`aspect-square rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center overflow-hidden relative shadow-inner`}>
                                  <Bookmark className="w-6 h-6 text-white/30" />
                                </div>
                                <p className="text-[10px] font-bold text-white/80 leading-tight truncate px-1">{style.name}</p>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteCustomStyle(style.id);
                                }}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {STYLES.map(style => (
                          <button
                            key={style.id}
                            onClick={() => {
                              runAction(`Estilo: ${style.name}`, style.prompt);
                              setSubMenu('none');
                            }}
                            className="group flex flex-col gap-2 p-2 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all text-left"
                          >
                            <div className={`aspect-square rounded-xl bg-gradient-to-br ${style.color || 'from-accent to-accent/40'} flex items-center justify-center overflow-hidden relative shadow-inner`}>
                              {(stylePreviews[style.id] || (style as any).previewUrl) ? (
                                <img src={stylePreviews[style.id] || (style as any).previewUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                              ) : (
                                <Zap className={`w-8 h-8 transition-transform group-hover:scale-110 duration-500 ${style.iconStyle || 'text-white/30'}`} />
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-white/80 leading-tight truncate px-1">{style.shortName || style.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {MOCKUPS.map(mockup => (
                      <button
                        key={mockup.id}
                        onClick={() => {
                          runAction(`Mockup: ${mockup.name}`, mockup.prompt);
                          setSubMenu('none');
                        }}
                        className="group flex flex-col gap-3 p-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all text-left"
                      >
                        <div className="aspect-square rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          {mockup.icon === 'Arm' && <Hand className="w-8 h-8 text-accent" />}
                          {mockup.icon === 'Leg' && <Footprints className="w-8 h-8 text-accent" />}
                          {mockup.icon === 'Torso' && <Accessibility className="w-8 h-8 text-accent" />}
                          {mockup.icon === 'Back' && <User className="w-8 h-8 text-accent rotate-180" />}
                          {mockup.icon === 'BodyFront' && <User className="w-8 h-8 text-accent" />}
                          {mockup.icon === 'BodyBack' && <User className="w-8 h-8 text-accent rotate-180" />}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-white leading-tight truncate">{mockup.name}</p>
                          <p className="text-[8px] text-white/40 mt-1 line-clamp-1">{mockup.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Prompt View Modal */}
      <AnimatePresence>
        {showPromptView && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPromptView(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-zinc-900 rounded-3xl p-6 border border-white/10 shadow-2xl relative z-10"
            >
              <button 
                onClick={() => setShowPromptView(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="mb-4">
                <h3 className="text-xs font-mono text-accent uppercase tracking-widest">Prompt Extraído</h3>
              </div>
              <div className="bg-black/40 rounded-xl p-4 border border-white/5 max-h-[50vh] overflow-y-auto no-scrollbar">
                <pre className="whitespace-pre-wrap font-mono text-sm text-white/80 leading-relaxed">
                  {result}
                </pre>
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(result || '');
                    alert('Copiado para a área de transferência!');
                  }}
                  className="flex-1 bg-accent text-white rounded-xl py-3 font-bold hover:bg-opacity-90 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copiar Prompt
                </button>
                <button 
                  onClick={() => setShowPromptView(false)}
                  className="flex-1 bg-white/5 text-white rounded-xl py-3 font-bold hover:bg-white/10 transition-all text-sm"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
