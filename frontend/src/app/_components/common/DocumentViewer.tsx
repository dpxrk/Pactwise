'use client';

import React, { useState, useEffect } from 'react';
import { useConvexQuery } from '@/lib/api-client';
// import { api } from '../../../../convex/_generated/api';
// import { Id } from '../../../../convex/_generated/dataModel';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// Icons
import {
  FileText,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  AlertCircle,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Printer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OptimizedImage } from '@/components/performance/OptimizedImage';

interface DocumentViewerProps {
  storageId: Id<"_storage">;
  fileName?: string;
  fileType?: string;
  className?: string;
  showHeader?: boolean;
  showControls?: boolean;
  height?: string;
  onClose?: () => void;
}

export const DocumentViewer = ({
  storageId,
  fileName = 'Document',
  fileType = 'pdf',
  className,
  showHeader = true,
  showControls = true,
  height = 'h-[600px]',
  onClose
}: DocumentViewerProps) => {
  // State
  const [scale, setScale] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch file URL from Convex
  const { data: fileUrl, isLoading: isLoadingUrl, error: urlError } = useConvexQuery(
    api.contracts.getContractFileUrl,
    storageId ? { storageId } : "skip"
  );

  useEffect(() => {
    if (urlError) {
      setError(urlError.message);
      setIsLoading(false);
    } else if (fileUrl) {
      setIsLoading(false);
    }
  }, [fileUrl, urlError]);

  // File type detection and support
  const getSupportedFileTypes = () => {
    return ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'txt', 'md'];
  };

  const isFileTypeSupported = () => {
    const supportedTypes = getSupportedFileTypes();
    const fileExt = fileType.toLowerCase().replace('.', '');
    return supportedTypes.includes(fileExt);
  };

  const isPdfFile = () => {
    return fileType.toLowerCase().includes('pdf');
  };

  const isImageFile = () => {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    return imageTypes.some(type => fileType.toLowerCase().includes(type));
  };

  const isTextFile = () => {
    const textTypes = ['txt', 'md', 'text'];
    return textTypes.some(type => fileType.toLowerCase().includes(type));
  };

  // Control handlers
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 25, 25));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  // Render controls
  const renderControls = () => {
    if (!showControls) return null;

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-muted rounded-md p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={scale <= 25}
            className="h-7 w-7 p-0"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs px-2 min-w-[50px] text-center">{scale}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={scale >= 300}
            className="h-7 w-7 p-0"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Page navigation for PDFs */}
        {isPdfFile() && totalPages > 1 && (
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs px-2 min-w-[60px] text-center">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Rotation for images */}
        {isImageFile() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRotate}
            className="h-7 w-7 p-0"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        )}

        {/* Fullscreen toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFullscreen}
          className="h-7 w-7 p-0"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>

        {/* Download */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="h-7 w-7 p-0"
        >
          <Download className="h-4 w-4" />
        </Button>

        {/* Print */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrint}
          className="h-7 w-7 p-0"
        >
          <Printer className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  // Render file content
  const renderFileContent = () => {
    if (isLoading || isLoadingUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <div className="space-y-2 text-center">
            <p className="text-sm font-medium">Loading document...</p>
            <Progress value={33} className="w-48" />
          </div>
        </div>
      );
    }

    if (error || !fileUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground" />
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-muted-foreground">Unable to load document</p>
            <p className="text-sm text-muted-foreground">
              {error || 'The document could not be retrieved.'}
            </p>
            <Button onClick={handleDownload} variant="outline" size="sm" disabled={!fileUrl}>
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        </div>
      );
    }

    if (!isFileTypeSupported()) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <FileText className="h-16 w-16 text-muted-foreground" />
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-muted-foreground">Preview not available</p>
            <p className="text-sm text-muted-foreground">
              File type .{fileType} is not supported for preview.
            </p>
            <Badge variant="outline" className="mb-2">
              Supported: {getSupportedFileTypes().join(', ')}
            </Badge>
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download {fileName}
            </Button>
          </div>
        </div>
      );
    }

    // Render based on file type
    const containerStyle = {
      transform: `scale(${scale / 100}) rotate(${rotation}deg)`,
      transformOrigin: 'center',
      transition: 'transform 0.2s ease-in-out',
    };

    if (isPdfFile()) {
      return (
        <div className="flex items-center justify-center h-full overflow-auto">
          <div style={containerStyle}>
            <iframe
              src={`${fileUrl}#page=${currentPage}&zoom=${scale}`}
              className="w-full h-full border-0"
              style={{ minHeight: '500px', minWidth: '400px' }}
              title={fileName}
              onLoad={() => {
                // Could implement PDF page counting here with a library
                setTotalPages(1); // Placeholder
              }}
            />
          </div>
        </div>
      );
    }

    if (isImageFile()) {
      return (
        <div className="flex items-center justify-center h-full overflow-auto p-4">
          <div style={containerStyle}>
            <OptimizedImage
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-full"
              objectFit="contain"
              onError={() => setError('Failed to load image')}
              priority
            />
          </div>
        </div>
      );
    }

    if (isTextFile()) {
      return (
        <div className="h-full overflow-auto p-4">
          <div style={containerStyle}>
            <iframe
              src={fileUrl}
              className="w-full h-full border-0 bg-white"
              style={{ minHeight: '500px' }}
              title={fileName}
            />
          </div>
        </div>
      );
    }

    // Fallback for other supported types
    return (
      <div className="flex items-center justify-center h-full overflow-auto">
        <div style={containerStyle}>
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            style={{ minHeight: '500px', minWidth: '400px' }}
            title={fileName}
          />
        </div>
      </div>
    );
  };

  // Main render
  const content = (
    <Card className={cn('w-full', className)}>
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            <span className="truncate">{fileName}</span>
            <Badge variant="outline" className="text-xs">
              {fileType.toUpperCase()}
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {renderControls()}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        <div className={cn(height, 'relative bg-muted/20')}>
          {renderFileContent()}
        </div>
      </CardContent>
    </Card>
  );

  // Fullscreen wrapper
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="h-full w-full">
          {React.cloneElement(content, {
            className: cn(className, 'h-full'),
            children: React.cloneElement(content.props.children, {
              children: [
                content.props.children.props.children[0], // Header
                React.cloneElement(content.props.children.props.children[1], {
                  children: React.cloneElement(
                    content.props.children.props.children[1].props.children,
                    { className: 'h-full' }
                  )
                })
              ]
            })
          })}
        </div>
      </div>
    );
  }

  return content;
};

export default DocumentViewer;