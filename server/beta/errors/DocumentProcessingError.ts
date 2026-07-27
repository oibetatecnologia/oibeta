export type DocumentErrorCode = 
  | 'FILE_NOT_FOUND'
  | 'INVALID_FORMAT'
  | 'UNSUPPORTED_FORMAT'
  | 'PROCESSING_ERROR'
  | 'CANCELED'
  | 'OUTPUT_ERROR';

export class DocumentProcessingError extends Error {
  constructor(
    public message: string,
    public code: DocumentErrorCode,
    public context?: any
  ) {
    super(message);
    this.name = 'DocumentProcessingError';
  }
}
