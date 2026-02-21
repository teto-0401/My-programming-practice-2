import { useState, useEffect } from "react";
import { Monitor, Expand, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface VmDisplayProps {
  isRunning: boolean;
  vncPort?: number;
}

export function VmDisplay({ isRunning }: VmDisplayProps) {
  const [iframeKey, setIframeKey] = useState(0);

  const refreshDisplay = () => {
    setIframeKey(prev => prev + 1);
  };

  // Auto-refresh when VM starts running
  useEffect(() => {
    if (isRunning) {
      refreshDisplay();
    }
  }, [isRunning]);

  if (!isRunning) {
    return (
      <div className="w-full h-full bg-black/80 rounded-xl border border-border flex flex-col items-center justify-center text-muted-foreground min-h-[400px] relative overflow-hidden group">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        
        <div className="relative z-10 p-6 rounded-full bg-muted/20 border border-white/5 group-hover:scale-110 transition-transform duration-500">
          <Monitor className="w-16 h-16 opacity-50" />
        </div>
        <div className="mt-6 text-center space-y-2">
          <h3 className="text-xl font-display font-bold text-foreground/80">SYSTEM OFFLINE</h3>
          <p className="text-sm font-mono opacity-60">Start the VM to initialize display signal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[600px] bg-black rounded-xl border border-border shadow-2xl relative overflow-hidden flex flex-col">
      {/* Display Header */}
      <div className="h-10 bg-muted/40 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-mono font-medium text-green-500">LIVE SIGNAL</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={refreshDisplay}
            className="p-1.5 hover:bg-white/10 rounded-md text-muted-foreground hover:text-white transition-colors"
            title="Refresh Display"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <a 
            href="/novnc/vnc.html?autoconnect=true&reconnect=true" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-white/10 rounded-md text-muted-foreground hover:text-white transition-colors"
            title="Open in New Tab"
          >
            <Expand className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* VNC Iframe - Optimized for FPS */}
      <div className="flex-1 relative bg-black">
        <iframe
          key={iframeKey}
          src="/novnc/vnc.html?autoconnect=true&reconnect=true&resize=remote&view_clip=1&quality=4&compression=1&show_dot=true&logging=warn"
          className="absolute inset-0 w-full h-full border-0"
          title="VM Display"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
