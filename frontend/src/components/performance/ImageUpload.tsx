import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OptimizedImage } from './OptimizedImage';
import { convertToWebP } from '@/lib/image-utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ImageUploadProps {
  value?: string | File;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
  disabled?: boolean;
  compress?: boolean;
  convertToWebP?: boolean;
  width?: number;
  height?: number;
  aspectRatio?: number;
}

/**
 * Image upload component with compression and optimization
 */
export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  accept = 'image/*',
  maxSize = 5,
  className,
  disabled,
  compress = true,
  convertToWebP: shouldConvertToWebP = true,
  width = 200,
  height = 200,
  aspectRatio,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File): Promise<File> => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        throw new Error(`File size must be less than ${maxSize}MB`);
      }

      let processedFile = file;
      setProgress(25);

      // Convert to WebP if enabled
      if (shouldConvertToWebP && !file.type.includes('webp')) {
        const webpBlob = await convertToWebP(file);
        processedFile = new File([webpBlob], file.name.replace(/\.[^.]+$/, '.webp'), {
          type: 'image/webp',
        });
        setProgress(50);
      }

      // Compress if enabled
      if (compress) {
        processedFile = await compressImage(processedFile, 0.8);
        setProgress(75);
      }

      setProgress(100);
      return processedFile;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
      throw err;
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    try {
      const processedFile = await processImage(file);
      onChange(processedFile);
    } catch (err) {
      // Error already handled in processImage
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find(file => file.type.startsWith('image/'));

      if (imageFile) {
        await handleFileSelect(imageFile);
      } else {
        setError('Please drop an image file');
      }
    },
    [disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const getImageUrl = () => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return URL.createObjectURL(value);
  };

  const imageUrl = getImageUrl();

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || isProcessing}
      />

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative border-2 border-dashed rounded-lg transition-all cursor-pointer',
          isDragging && 'border-primary bg-primary/5',
          !isDragging && 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-red-500',
          imageUrl && 'border-solid'
        )}
        style={{
          width,
          height: aspectRatio ? width / aspectRatio : height,
        }}
      >
        {imageUrl ? (
          <>
            <OptimizedImage
              src={imageUrl}
              alt="Upload preview"
              width={width}
              height={aspectRatio ? width / aspectRatio : height}
              className="rounded-lg"
              objectFit="cover"
            />
            {!disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <Upload className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 text-center">
              {isDragging ? 'Drop image here' : 'Click or drag image to upload'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Max size: {maxSize}MB
            </p>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center rounded-lg">
            <div className="w-3/4">
              <Progress value={progress} className="mb-2" />
              <p className="text-xs text-gray-600 text-center">Processing image...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute bottom-0 left-0 right-0 bg-red-50 border-t border-red-200 p-2 rounded-b-lg">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-xs">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Multiple image upload component
 */
interface MultipleImageUploadProps {
  value?: (string | File)[];
  onChange: (files: (string | File)[]) => void;
  maxFiles?: number;
  maxSize?: number;
  className?: string;
  disabled?: boolean;
}

export const MultipleImageUpload: React.FC<MultipleImageUploadProps> = ({
  value = [],
  onChange,
  maxFiles = 5,
  maxSize = 5,
  className,
  disabled,
}) => {
  const handleAddImage = (file: File | null) => {
    if (file && value.length < maxFiles) {
      onChange([...value, file]);
    }
  };

  const handleRemoveImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {value.map((file, index) => (
          <div key={index} className="relative">
            <OptimizedImage
              src={typeof file === 'string' ? file : URL.createObjectURL(file)}
              alt={`Image ${index + 1}`}
              width={150}
              height={150}
              className="rounded-lg"
              objectFit="cover"
            />
            {!disabled && (
              <button
                onClick={() => handleRemoveImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        
        {value.length < maxFiles && (
          <ImageUpload
            onChange={handleAddImage}
            maxSize={maxSize}
            disabled={disabled}
            width={150}
            height={150}
          />
        )}
      </div>
      
      <p className="text-sm text-gray-500">
        {value.length} / {maxFiles} images uploaded
      </p>
    </div>
  );
};

// Helper function to compress image
async function compressImage(file: File, quality: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        const maxDimension = 1920;
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              }));
            } else {
              reject(new Error('Could not compress image'));
            }
          },
          file.type,
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}