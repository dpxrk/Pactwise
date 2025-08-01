/**
 * Event types for React components to replace 'any' usage
 */

import { ChangeEvent, FormEvent, KeyboardEvent, MouseEvent, ClipboardEvent } from 'react';

// Form Events
export type FormSubmitEvent = FormEvent<HTMLFormElement>;
export type InputChangeEvent = ChangeEvent<HTMLInputElement>;
export type TextAreaChangeEvent = ChangeEvent<HTMLTextAreaElement>;
export type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;
export type FileInputChangeEvent = ChangeEvent<HTMLInputElement> & {
  target: HTMLInputElement & { files: FileList };
};

// Keyboard Events
export type KeyboardEventHandler<T = HTMLElement> = (event: KeyboardEvent<T>) => void;
export type InputKeyboardEvent = KeyboardEvent<HTMLInputElement>;
export type TextAreaKeyboardEvent = KeyboardEvent<HTMLTextAreaElement>;
export type DivKeyboardEvent = KeyboardEvent<HTMLDivElement>;

// Mouse Events
export type MouseEventHandler<T = HTMLElement> = (event: MouseEvent<T>) => void;
export type ButtonClickEvent = MouseEvent<HTMLButtonElement>;
export type DivClickEvent = MouseEvent<HTMLDivElement>;
export type LinkClickEvent = MouseEvent<HTMLAnchorElement>;

// Clipboard Events
export type ClipboardEventHandler<T = HTMLElement> = (event: ClipboardEvent<T>) => void;
export type InputPasteEvent = ClipboardEvent<HTMLInputElement>;
export type DivPasteEvent = ClipboardEvent<HTMLDivElement>;

// Custom Select Events (for UI libraries like Radix)
export type SelectValueChangeHandler = (value: string) => void;
export type MultiSelectValueChangeHandler = (values: string[]) => void;

// Date Picker Events
export type DateChangeHandler = (date: Date | null) => void;
export type DateRangeChangeHandler = (range: { start: Date | null; end: Date | null }) => void;

// File Upload Events
export interface FileUploadEvent {
  file: File;
  progress?: number;
  status?: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

// Drag and Drop Events
export interface DragDropEvent {
  dataTransfer: DataTransfer;
  preventDefault: () => void;
  stopPropagation: () => void;
}

// Table Events
export interface TableRowClickEvent<T = unknown> {
  row: T;
  index: number;
  event: MouseEvent;
}

export interface TableSortEvent {
  column: string;
  direction: 'asc' | 'desc';
}

export interface TableFilterEvent {
  column: string;
  value: unknown;
  operator?: 'equals' | 'contains' | 'greater' | 'less';
}

// Search Events
export interface SearchEvent {
  query: string;
  filters?: Record<string, unknown>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

// Pagination Events
export interface PaginationEvent {
  page: number;
  pageSize: number;
  total?: number;
}

// Modal/Dialog Events
export interface ModalEvent {
  action: 'open' | 'close' | 'confirm' | 'cancel';
  data?: unknown;
}

// Toast/Notification Events
export interface NotificationEvent {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
}

// Chart Events
export interface ChartClickEvent {
  dataPoint: {
    label: string;
    value: number;
    index: number;
    series?: string;
  };
  event: MouseEvent;
}

export interface ChartHoverEvent {
  dataPoint: {
    label: string;
    value: number;
    index: number;
    series?: string;
  } | null;
  event: MouseEvent;
}

// Editor Events
export interface EditorChangeEvent {
  content: string;
  delta?: unknown; // For rich text editors
  plainText?: string;
  html?: string;
}

export interface EditorSelectionEvent {
  range: {
    start: number;
    end: number;
  };
  text: string;
}

// WebSocket Events
export interface WebSocketMessageEvent<T = unknown> {
  type: string;
  data: T;
  timestamp: number;
}

// Generic Event Handler Types
export type AsyncEventHandler<T> = (event: T) => Promise<void>;
export type EventHandlerWithError<T> = (event: T) => void | Promise<void>;

// Utility type for extracting event target value
export type TargetValue<T extends { target: { value: unknown } }> = T['target']['value'];