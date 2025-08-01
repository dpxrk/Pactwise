// Document processing and metadata type definitions

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  content?: string;
  url?: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  metadata?: DocumentMetadata;
  extracted?: ExtractedData;
  status: DocumentStatus;
}

export type DocumentType = 
  | 'contract'
  | 'invoice'
  | 'proposal'
  | 'report'
  | 'certificate'
  | 'legal'
  | 'financial'
  | 'other';

export type DocumentStatus = 
  | 'uploaded'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'archived';

export interface DocumentMetadata {
  contractId?: string;
  vendorId?: string;
  category?: string;
  tags?: string[];
  language?: string;
  pageCount?: number;
  isScanned?: boolean;
  ocrConfidence?: number;
  customFields?: Record<string, unknown>;
}

export interface ExtractedData {
  text?: string;
  structure?: DocumentStructure;
  entities?: ExtractedEntity[];
  dates?: ExtractedDate[];
  amounts?: ExtractedAmount[];
  clauses?: ExtractedClause[];
  tables?: ExtractedTable[];
  metadata?: ExtractedMetadata;
}

export interface DocumentStructure {
  sections: DocumentSection[];
  headings: string[];
  paragraphs: number;
  lists?: ListStructure[];
  language?: string;
}

export interface DocumentSection {
  title: string;
  level: number;
  startIndex: number;
  endIndex: number;
  content?: string;
}

export interface ListStructure {
  type: 'ordered' | 'unordered';
  items: string[];
  startIndex: number;
}

export interface ExtractedEntity {
  type: 'person' | 'organization' | 'location' | 'date' | 'money' | 'email' | 'phone';
  value: string;
  confidence: number;
  context?: string;
  position?: TextPosition;
}

export interface ExtractedDate {
  value: string;
  formatted: string;
  type: 'effective' | 'expiry' | 'signed' | 'created' | 'deadline' | 'other';
  confidence: number;
  context?: string;
}

export interface ExtractedAmount {
  value: number;
  currency: string;
  formatted: string;
  type: 'total' | 'payment' | 'penalty' | 'discount' | 'tax' | 'other';
  confidence: number;
  context?: string;
}

export interface ExtractedClause {
  type: string;
  title?: string;
  text: string;
  category?: string;
  risk?: 'low' | 'medium' | 'high';
  position?: TextPosition;
}

export interface ExtractedTable {
  headers: string[];
  rows: string[][];
  position?: TextPosition;
  confidence: number;
}

export interface ExtractedMetadata {
  title?: string;
  author?: string;
  createdDate?: string;
  modifiedDate?: string;
  documentType?: string;
  confidence: number;
}

export interface TextPosition {
  page?: number;
  startIndex: number;
  endIndex: number;
  boundingBox?: BoundingBox;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DocumentProcessingResult {
  documentId: string;
  success: boolean;
  extracted?: ExtractedData;
  insights?: DocumentInsight[];
  errors?: ProcessingError[];
  processingTime: number;
}

export interface DocumentInsight {
  type: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  data?: unknown;
}

export interface ProcessingError {
  code: string;
  message: string;
  details?: unknown;
}