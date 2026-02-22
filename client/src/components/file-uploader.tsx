import { useState, useRef } from "react";
import { Upload, CheckCircle, Loader2 } from "lucide-react";
import { useUploadVmImage, useLocalUploads, useSetVmImage } from "@/hooks/use-vm";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export function FileUploader({ currentImage }: { currentImage?: string | null }) {
  const [dragActive, setDragActive] = useState(false);
  const [mountingName, setMountingName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, progress, isUploading } = useUploadVmImage();
  const { data: localUploads, isLoading: isLoadingUploads } = useLocalUploads();
  const { mutate: setImage } = useSetVmImage();
  const { toast } = useToast();
  const currentFilename = currentImage ? currentImage.split('/').pop() : null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validExtensions = ['.bin', '.iso', '.img'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(extension)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .bin, .iso, or .img file.",
        variant: "destructive",
      });
      return;
    }

    upload(file, {
      onSuccess: (data) => {
        toast({
          title: "Upload complete",
          description: `Successfully uploaded ${data.filename}`,
        });
      },
      onError: (error) => {
        toast({
          title: "Upload failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Disk Image</h3>
        {currentImage && (
          <span className="text-xs font-mono text-primary flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            MOUNTED
          </span>
        )}
      </div>

      <div
        data-testid="dropzone-upload"
        className={`
          relative w-full h-48 rounded-xl border-2 border-dashed transition-all duration-300
          flex flex-col items-center justify-center cursor-pointer overflow-hidden
          ${dragActive 
            ? "border-primary bg-primary/5 scale-[1.02]" 
            : "border-border hover:border-primary/50 hover:bg-muted/50"}
          ${isUploading ? "pointer-events-none opacity-80" : ""}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".bin,.iso,.img"
          onChange={handleChange}
          data-testid="input-file"
        />

        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-4 w-full px-8"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full blur-md bg-primary/20 animate-pulse" />
                <Loader2 className="w-10 h-10 text-primary animate-spin relative z-10" />
              </div>
              
              <div className="w-full space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-foreground">Uploading...</span>
                  <span className="font-mono text-primary font-bold" data-testid="text-upload-progress">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" data-testid="progress-upload" />
              </div>
              
              <p className="text-xs text-muted-foreground">This may take a while for large files</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-3 text-center p-6"
            >
              <div className={`p-4 rounded-full bg-muted transition-colors ${dragActive ? 'bg-primary/20' : ''}`}>
                <Upload className={`w-8 h-8 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Click or drag file to upload
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports .bin, .iso, .img (ChromeOS Flex images)
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {dragActive && (
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px] flex items-center justify-center">
            <p className="text-lg font-bold text-primary animate-pulse">DROP TO UPLOAD</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Local Uploads</h4>
        {isLoadingUploads ? (
          <div className="text-xs text-muted-foreground">Loading...</div>
        ) : localUploads && localUploads.length > 0 ? (
          <div className="space-y-2">
            {localUploads.map((img) => (
              <div key={img.filename} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{img.filename}</div>
                  <div className="text-xs text-muted-foreground">{formatFileSize(img.sizeBytes)}</div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={mountingName === img.filename || currentFilename === img.filename}
                  onClick={() => {
                    setMountingName(img.filename);
                    setImage(img.filename, {
                      onSuccess: () => {
                        toast({
                          title: "Image mounted",
                          description: img.filename,
                        });
                        setMountingName(null);
                      },
                      onError: (error) => {
                        toast({
                          title: "Mount failed",
                          description: error.message,
                          variant: "destructive",
                        });
                        setMountingName(null);
                      },
                    });
                  }}
                >
                  {currentFilename === img.filename ? "Mounted" : (mountingName === img.filename ? "Mounting..." : "Mount")}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No saved images yet.</div>
        )}
      </div>
    </div>
  );
}
