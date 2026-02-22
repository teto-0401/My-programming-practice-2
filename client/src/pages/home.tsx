import { useState, useEffect } from "react";
import { useVm, useStartVm, useStopVm, useSnapshots, useSaveSnapshot, useDeleteSnapshot, useUpdateVmSettings, useStartFromSnapshot } from "@/hooks/use-vm";
import { FileUploader } from "@/components/file-uploader";
import { VmDisplay } from "@/components/vm-display";
import { StatusBadge } from "@/components/status-badge";
import { Power, Square, Terminal, Cpu, HardDrive, Activity, Save, Trash2, Camera, Settings, MemoryStick, Monitor, Play } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { data: vm, isLoading } = useVm();
  const { mutate: startVm, isPending: isStarting } = useStartVm();
  const { mutate: stopVm, isPending: isStopping } = useStopVm();
  const { data: snapshots } = useSnapshots();
  const { mutate: saveSnapshot, isPending: isSaving } = useSaveSnapshot();
  const { mutate: deleteSnapshot } = useDeleteSnapshot();
  const { mutate: updateSettings, isPending: isUpdating } = useUpdateVmSettings();
  const { mutate: startFromSnapshot, isPending: isRestoring } = useStartFromSnapshot();
  const { toast } = useToast();

  const [ramMb, setRamMb] = useState(2048);
  const [vramMb, setVramMb] = useState(16);

  const handleStartFromSnapshot = (snapshotName: string) => {
    if (!hasImage) {
      toast({ title: "No disk image", description: "Upload an image first", variant: "destructive" });
      return;
    }
    startFromSnapshot(snapshotName, {
      onSuccess: () => {
        toast({ title: "VM Restored", description: `Started from ${snapshotName}` });
      },
      onError: (e) => {
        toast({ title: "Restore Failed", description: e.message, variant: "destructive" });
      },
    });
  };

  useEffect(() => {
    if (vm) {
      setRamMb(vm.ramMb);
      setVramMb(vm.vramMb);
    }
  }, [vm?.ramMb, vm?.vramMb]);

  const isRunning = vm?.status === "running";
  const hasImage = !!vm?.imagePath;

  const handleSaveSettings = () => {
    updateSettings({ ramMb, vramMb }, {
      onSuccess: () => {
        toast({ title: "Settings Saved", description: `RAM: ${ramMb}MB, VRAM: ${vramMb}MB` });
      },
      onError: (e) => {
        toast({ title: "Failed", description: e.message, variant: "destructive" });
      },
    });
  };

  const handleSaveSnapshot = () => {
    saveSnapshot(undefined, {
      onSuccess: (data) => {
        toast({ title: "Snapshot Saved", description: `State saved as ${data.name}` });
      },
      onError: (e) => {
        toast({ title: "Save Failed", description: e.message, variant: "destructive" });
      },
    });
  };

  const handleDeleteSnapshot = (name: string) => {
    deleteSnapshot(name, {
      onSuccess: () => {
        toast({ title: "Snapshot Deleted", description: `${name} has been removed` });
      },
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleStart = () => {
    if (!hasImage) {
      toast({
        title: "No disk image",
        description: "Please upload a ChromeOS Flex .bin file first.",
        variant: "destructive",
      });
      return;
    }
    startVm(undefined, {
      onSuccess: () => {
        toast({ title: "System Initializing", description: "Boot sequence started..." });
      },
    });
  };

  const handleStop = () => {
    stopVm(undefined, {
      onSuccess: () => {
        toast({ title: "System Halting", description: "Shutting down VM..." });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 animate-pulse" />
          <span className="font-mono text-sm tracking-[0.2em] animate-pulse">INITIALIZING CORE...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
              HYPERVISOR_01
            </h1>
            <p className="text-muted-foreground font-mono text-sm">
              ChromeOS Flex Virtualization Environment
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <StatusBadge status={vm?.status || "unknown"} />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar / Controls */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Control Panel Card */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Cpu className="w-24 h-24" />
              </div>
              
              <h2 className="text-lg font-display font-bold mb-6 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-primary" />
                SYSTEM CONTROLS
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <button
                  onClick={handleStart}
                  disabled={isRunning || isStarting || !hasImage}
                  className={`
                    relative group overflow-hidden rounded-xl p-4 flex flex-col items-center justify-center gap-3 border transition-all duration-300
                    ${isRunning 
                      ? "opacity-50 cursor-not-allowed border-border bg-muted/20" 
                      : "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]"}
                  `}
                >
                  <Power className={`w-8 h-8 ${isRunning ? "text-muted-foreground" : "text-primary group-hover:scale-110 transition-transform"}`} />
                  <span className="font-bold text-sm">START VM</span>
                </button>

                <button
                  onClick={handleStop}
                  disabled={!isRunning || isStopping}
                  className={`
                    relative group overflow-hidden rounded-xl p-4 flex flex-col items-center justify-center gap-3 border transition-all duration-300
                    ${!isRunning 
                      ? "opacity-50 cursor-not-allowed border-border bg-muted/20" 
                      : "border-destructive/30 bg-destructive/5 hover:bg-destructive/10 hover:border-destructive hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]"}
                  `}
                >
                  <Square className={`w-8 h-8 fill-current ${!isRunning ? "text-muted-foreground" : "text-destructive group-hover:scale-110 transition-transform"}`} />
                  <span className="font-bold text-sm">STOP VM</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">CPU Cores</span>
                  <span className="font-mono font-bold">4 vCPU</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/50 w-full animate-pulse" />
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Memory</span>
                  <span className="font-mono font-bold">4096 MB</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/50 w-full animate-pulse" style={{ animationDelay: "0.5s" }} />
                </div>
              </div>
            </motion.div>

            {/* Storage Card */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-xl"
            >
              <h2 className="text-lg font-display font-bold mb-6 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-accent" />
                STORAGE MOUNT
              </h2>
              
              <FileUploader currentImage={vm?.imagePath} />
            </motion.div>

            {/* RAM/VRAM Settings Card */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-xl"
            >
              <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                HARDWARE CONFIG
              </h2>

              <div className="space-y-4">
                {/* RAM Setting */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-mono">
                      <MemoryStick className="w-4 h-4 text-muted-foreground" />
                      RAM (MB)
                    </label>
                    <span className="text-sm font-mono text-primary">{ramMb} MB</span>
                  </div>
                  <select
                    value={ramMb}
                    onChange={(e) => setRamMb(Number(e.target.value))}
                    disabled={isRunning}
                    data-testid="select-ram"
                    className="w-full p-2 rounded-lg bg-muted/30 border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    <option value={256}>256 MB</option>
                    <option value={512}>512 MB</option>
                    <option value={1024}>1024 MB (1 GB)</option>
                    <option value={2048}>2048 MB (2 GB)</option>
                    <option value={4096}>4096 MB (4 GB)</option>
                  </select>
                </div>

                {/* VRAM Setting */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-mono">
                      <Monitor className="w-4 h-4 text-muted-foreground" />
                      VRAM (MB)
                    </label>
                    <span className="text-sm font-mono text-accent">{vramMb} MB</span>
                  </div>
                  <select
                    value={vramMb}
                    onChange={(e) => setVramMb(Number(e.target.value))}
                    disabled={isRunning}
                    data-testid="select-vram"
                    className="w-full p-2 rounded-lg bg-muted/30 border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    <option value={8}>8 MB (Low)</option>
                    <option value={16}>16 MB (Default)</option>
                    <option value={32}>32 MB</option>
                    <option value={64}>64 MB</option>
                    <option value={128}>128 MB</option>
                  </select>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={isRunning || isUpdating}
                  data-testid="button-save-settings"
                  className={`
                    w-full flex items-center justify-center gap-2 rounded-xl p-3 border transition-all duration-300
                    ${isRunning 
                      ? "opacity-50 cursor-not-allowed border-border bg-muted/20" 
                      : "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary"}
                  `}
                >
                  <Save className="w-5 h-5" />
                  <span className="font-bold text-sm">{isUpdating ? "SAVING..." : "APPLY"}</span>
                </button>

                {isRunning && (
                  <p className="text-xs text-muted-foreground text-center">Stop VM to change settings</p>
                )}
              </div>
            </motion.div>

            {/* Snapshots Card */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl border border-border p-6 shadow-xl"
            >
              <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                SNAPSHOTS
              </h2>

              <button
                onClick={handleSaveSnapshot}
                disabled={!isRunning || isSaving}
                data-testid="button-save-snapshot"
                className={`
                  w-full mb-4 flex items-center justify-center gap-2 rounded-xl p-3 border transition-all duration-300
                  ${!isRunning 
                    ? "opacity-50 cursor-not-allowed border-border bg-muted/20" 
                    : "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary"}
                `}
              >
                <Save className="w-5 h-5" />
                <span className="font-bold text-sm">{isSaving ? "SAVING..." : "SAVE STATE"}</span>
              </button>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {snapshots?.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-4">No snapshots yet</p>
                )}
                {snapshots?.map((snapshot) => (
                  <div 
                    key={snapshot.name}
                    className="flex items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg border border-border/50"
                    data-testid={`snapshot-item-${snapshot.name}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono truncate">{new Date(snapshot.createdAt).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(snapshot.size)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartFromSnapshot(snapshot.name)}
                        disabled={isRunning || isRestoring}
                        className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
                        data-testid={`button-start-snapshot-${snapshot.name}`}
                        title="Start from this snapshot"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSnapshot(snapshot.name)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        data-testid={`button-delete-snapshot-${snapshot.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Main Display Area */}
          <div className="lg:col-span-8 h-[600px] lg:h-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="h-full"
            >
              <VmDisplay isRunning={isRunning} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
