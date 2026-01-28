import { useCallback } from 'react';
import { Upload, FileSpreadsheet, Database, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploaderProps {
  accept: string;
  label: string;
  description: string;
  icon: 'model' | 'data';
  file: File | null;
  onFileSelect: (file: File | null) => void;
}

export function FileUploader({
  accept,
  label,
  description,
  icon,
  file,
  onFileSelect
}: FileUploaderProps) {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      onFileSelect(droppedFile);
    }
  }, [onFileSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  }, [onFileSelect]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
  }, [onFileSelect]);

  const Icon = icon === 'model' ? Database : FileSpreadsheet;

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-foreground mb-2">
        {label}
      </label>
      
      <div
        className={cn(
          "upload-zone relative cursor-pointer group",
          file && "border-primary/30 bg-primary/5"
        )}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => document.getElementById(`file-${icon}`)?.click()}
      >
        <input
          id={`file-${icon}`}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
        
        <AnimatePresence mode="wait">
          {file ? (
            <motion.div
              key="file-selected"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleRemove}
                className="p-2 rounded-full hover:bg-destructive/10 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="file-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-4"
            >
              <div className="w-12 h-12 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              
              <div className="flex items-center justify-center gap-2 mb-2">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Drop file or click to browse
                </span>
              </div>
              
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
