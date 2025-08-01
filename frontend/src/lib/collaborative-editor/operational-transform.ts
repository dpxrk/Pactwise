// src/lib/collaborative-editor/operational-transform.ts
import {
  DocumentOperation,
  InsertOperation,
  DeleteOperation,
  RetainOperation,
  FormatOperation,
  OperationTransformResult,
  ConflictResolution,
  TransformContext,
  DocumentState,
  TextAttributes,
  isInsertOperation,
  isDeleteOperation,
  isRetainOperation,
  isFormatOperation,
  getOperationLength,
  OperationTransformError,
  ConflictResolutionError
} from '@/types/collaborative-editor.types';

// ============================================================================
// OPERATIONAL TRANSFORMATION CORE ENGINE
// ============================================================================

export class OperationalTransform {
  /**
   * Transform two concurrent operations against each other
   * This is the heart of operational transformation
   */
  static transform(
    op1: DocumentOperation,
    op2: DocumentOperation,
    context: TransformContext
  ): OperationTransformResult {
    try {
      // Handle identical operations
      if (this.areOperationsIdentical(op1, op2)) {
        return {
          transformedOperation: op1,
          requiresRebase: false
        };
      }

      // Transform based on operation types
      const result = this.transformByType(op1, op2, context);
      
      // Validate the transformation result
      this.validateTransformResult(result);
      
      return result;
    } catch (error) {
      throw new OperationTransformError(
        `Failed to transform operations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { op1, op2, context }
      );
    }
  }

  /**
   * Transform operation against a series of concurrent operations
   */
  static transformAgainstOperations(
    operation: DocumentOperation,
    concurrentOps: DocumentOperation[],
    context: TransformContext
  ): OperationTransformResult {
    let currentOp = operation;
    let requiresRebase = false;
    const conflictResolutions: ConflictResolution[] = [];

    for (const concurrentOp of concurrentOps) {
      const result = this.transform(currentOp, concurrentOp, context);
      currentOp = result.transformedOperation;
      
      if (result.requiresRebase) {
        requiresRebase = true;
      }
      
      if (result.conflictResolution) {
        conflictResolutions.push(result.conflictResolution);
      }
    }

    if (conflictResolutions.length > 0) {
      return {
        transformedOperation: currentOp,
        requiresRebase,
        conflictResolution: conflictResolutions[0]!
      };
    }
    
    return {
      transformedOperation: currentOp,
      requiresRebase
    };
  }

  // ============================================================================
  // TYPE-SPECIFIC TRANSFORMATION LOGIC
  // ============================================================================

  private static transformByType(
    op1: DocumentOperation,
    op2: DocumentOperation,
    context: TransformContext
  ): OperationTransformResult {
    // Insert vs Insert
    if (isInsertOperation(op1) && isInsertOperation(op2)) {
      return this.transformInsertInsert(op1, op2, context);
    }

    // Insert vs Delete
    if (isInsertOperation(op1) && isDeleteOperation(op2)) {
      return this.transformInsertDelete(op1, op2, context);
    }

    // Delete vs Insert
    if (isDeleteOperation(op1) && isInsertOperation(op2)) {
      return this.transformDeleteInsert(op1, op2, context);
    }

    // Delete vs Delete
    if (isDeleteOperation(op1) && isDeleteOperation(op2)) {
      return this.transformDeleteDelete(op1, op2, context);
    }

    // Insert vs Retain
    if (isInsertOperation(op1) && isRetainOperation(op2)) {
      return this.transformInsertRetain(op1, op2, context);
    }

    // Retain vs Insert
    if (isRetainOperation(op1) && isInsertOperation(op2)) {
      return this.transformRetainInsert(op1, op2, context);
    }

    // Format operations
    if (isFormatOperation(op1) || isFormatOperation(op2)) {
      return this.transformFormat(op1, op2, context);
    }

    // Retain vs Retain (usually no transformation needed)
    if (isRetainOperation(op1) && isRetainOperation(op2)) {
      return this.transformRetainRetain(op1, op2, context);
    }

    // Default case
    return {
      transformedOperation: op1,
      requiresRebase: false
    };
  }

  // ============================================================================
  // INSERT TRANSFORMATIONS
  // ============================================================================

  private static transformInsertInsert(
    op1: InsertOperation,
    op2: InsertOperation,
    context: TransformContext
  ): OperationTransformResult {
    if (op1.position <= op2.position) {
      // op1 comes before op2, adjust op2's position
      return {
        transformedOperation: {
          ...op1,
          position: op1.position
        },
        requiresRebase: false
      };
    } else {
      // op1 comes after op2, adjust op1's position
      return {
        transformedOperation: {
          ...op1,
          position: op1.position + op2.content.length
        },
        requiresRebase: false
      };
    }
  }

  private static transformInsertDelete(
    insert: InsertOperation,
    deleteOp: DeleteOperation,
    context: TransformContext
  ): OperationTransformResult {
    if (insert.position <= deleteOp.position) {
      // Insert comes before delete region
      return {
        transformedOperation: insert,
        requiresRebase: false
      };
    } else if (insert.position >= deleteOp.position + deleteOp.length) {
      // Insert comes after delete region
      return {
        transformedOperation: {
          ...insert,
          position: insert.position - deleteOp.length
        },
        requiresRebase: false
      };
    } else {
      // Insert is within delete region - conflict!
      return this.resolveInsertDeleteConflict(insert, deleteOp, context);
    }
  }

  private static transformDeleteInsert(
    deleteOp: DeleteOperation,
    insert: InsertOperation,
    context: TransformContext
  ): OperationTransformResult {
    if (deleteOp.position >= insert.position) {
      // Delete starts after insert
      return {
        transformedOperation: {
          ...deleteOp,
          position: deleteOp.position + insert.content.length
        },
        requiresRebase: false
      };
    } else if (deleteOp.position + deleteOp.length <= insert.position) {
      // Delete ends before insert
      return {
        transformedOperation: deleteOp,
        requiresRebase: false
      };
    } else {
      // Overlapping operations - potential conflict
      return this.resolveDeleteInsertConflict(deleteOp, insert, context);
    }
  }

  // ============================================================================
  // DELETE TRANSFORMATIONS
  // ============================================================================

  private static transformDeleteDelete(
    op1: DeleteOperation,
    op2: DeleteOperation,
    context: TransformContext
  ): OperationTransformResult {
    const op1End = op1.position + op1.length;
    const op2End = op2.position + op2.length;

    // Case 1: No overlap
    if (op1End <= op2.position) {
      // op1 comes completely before op2
      return {
        transformedOperation: op1,
        requiresRebase: false
      };
    } else if (op2End <= op1.position) {
      // op2 comes completely before op1
      return {
        transformedOperation: {
          ...op1,
          position: op1.position - op2.length
        },
        requiresRebase: false
      };
    }

    // Case 2: Complete overlap - one delete supersedes the other
    if (op1.position <= op2.position && op1End >= op2End) {
      // op1 completely contains op2
      return {
        transformedOperation: {
          ...op1,
          length: op1.length - Math.min(op2.length, op1End - op2.position)
        },
        requiresRebase: true
      };
    } else if (op2.position <= op1.position && op2End >= op1End) {
      // op2 completely contains op1 - op1 becomes no-op
      return {
        transformedOperation: {
          ...op1,
          length: 0
        },
        requiresRebase: true
      };
    }

    // Case 3: Partial overlap
    return this.resolveDeleteDeleteConflict(op1, op2, context);
  }

  // ============================================================================
  // RETAIN TRANSFORMATIONS
  // ============================================================================

  private static transformInsertRetain(
    insert: InsertOperation,
    retain: RetainOperation,
    context: TransformContext
  ): OperationTransformResult {
    if (insert.position <= retain.position) {
      return {
        transformedOperation: insert,
        requiresRebase: false
      };
    } else {
      return {
        transformedOperation: {
          ...insert,
          position: insert.position
        },
        requiresRebase: false
      };
    }
  }

  private static transformRetainInsert(
    retain: RetainOperation,
    insert: InsertOperation,
    context: TransformContext
  ): OperationTransformResult {
    if (retain.position >= insert.position) {
      return {
        transformedOperation: {
          ...retain,
          position: retain.position + insert.content.length
        },
        requiresRebase: false
      };
    } else {
      return {
        transformedOperation: retain,
        requiresRebase: false
      };
    }
  }

  private static transformRetainRetain(
    op1: RetainOperation,
    op2: RetainOperation,
    context: TransformContext
  ): OperationTransformResult {
    // Check for attribute conflicts
    if (op1.attributes && op2.attributes) {
      const mergedAttributes = this.mergeAttributes(op1.attributes, op2.attributes);
      return {
        transformedOperation: {
          ...op1,
          attributes: mergedAttributes
        },
        requiresRebase: false
      };
    }

    return {
      transformedOperation: op1,
      requiresRebase: false
    };
  }

  // ============================================================================
  // FORMAT TRANSFORMATIONS
  // ============================================================================

  private static transformFormat(
    op1: DocumentOperation,
    op2: DocumentOperation,
    context: TransformContext
  ): OperationTransformResult {
    if (isFormatOperation(op1) && isFormatOperation(op2)) {
      return this.transformFormatFormat(op1, op2, context);
    }

    // Format operations typically don't interfere with content operations
    return {
      transformedOperation: op1,
      requiresRebase: false
    };
  }

  private static transformFormatFormat(
    op1: FormatOperation,
    op2: FormatOperation,
    context: TransformContext
  ): OperationTransformResult {
    // Check for overlapping format regions
    const op1End = op1.position + op1.length;
    const op2End = op2.position + op2.length;

    if (op1.position < op2End && op2.position < op1End) {
      // Overlapping format operations - merge attributes
      const mergedAttributes = this.mergeAttributes(op1.attributes, op2.attributes);
      
      return {
        transformedOperation: {
          ...op1,
          attributes: mergedAttributes
        },
        requiresRebase: false
      };
    }

    return {
      transformedOperation: op1,
      requiresRebase: false
    };
  }

  // ============================================================================
  // CONFLICT RESOLUTION
  // ============================================================================

  private static resolveInsertDeleteConflict(
    insert: InsertOperation,
    deleteOp: DeleteOperation,
    context: TransformContext
  ): OperationTransformResult {
    const strategy = this.getConflictResolutionStrategy(insert, deleteOp, context);
    
    switch (strategy) {
      case 'user-priority':
        return this.resolveByUserPriority(insert, deleteOp, context);
      case 'timestamp':
        return this.resolveByTimestamp(insert, deleteOp, context);
      case 'merge':
        return this.resolveByMerge(insert, deleteOp, context);
      default:
        throw new ConflictResolutionError(
          `Unknown conflict resolution strategy: ${strategy}`,
          { insert, deleteOp }
        );
    }
  }

  private static resolveDeleteInsertConflict(
    deleteOp: DeleteOperation,
    insert: InsertOperation,
    context: TransformContext
  ): OperationTransformResult {
    // For delete-insert conflicts, typically preserve the insert
    return {
      transformedOperation: {
        ...deleteOp,
        length: Math.max(0, deleteOp.length - insert.content.length),
        position: deleteOp.position
      },
      requiresRebase: true,
      conflictResolution: {
        strategy: 'merge',
        winningOperation: insert,
        losingOperation: deleteOp
      }
    };
  }

  private static resolveDeleteDeleteConflict(
    op1: DeleteOperation,
    op2: DeleteOperation,
    context: TransformContext
  ): OperationTransformResult {
    // Calculate the overlapping region
    const overlapStart = Math.max(op1.position, op2.position);
    const overlapEnd = Math.min(op1.position + op1.length, op2.position + op2.length);
    const overlapLength = Math.max(0, overlapEnd - overlapStart);

    return {
      transformedOperation: {
        ...op1,
        length: op1.length - overlapLength
      },
      requiresRebase: true,
      conflictResolution: {
        strategy: 'merge',
        winningOperation: op2,
        losingOperation: op1
      }
    };
  }

  // ============================================================================
  // CONFLICT RESOLUTION STRATEGIES
  // ============================================================================

  private static resolveByUserPriority(
    op1: DocumentOperation,
    op2: DocumentOperation,
    context: TransformContext
  ): OperationTransformResult {
    const user1Priority = context.userPriorities[op1.userId] || 0;
    const user2Priority = context.userPriorities[op2.userId] || 0;

    if (user1Priority > user2Priority) {
      return {
        transformedOperation: op1,
        requiresRebase: false,
        conflictResolution: {
          strategy: 'user-priority',
          winningOperation: op1,
          losingOperation: op2
        }
      };
    } else {
      return {
        transformedOperation: op1,
        requiresRebase: true,
        conflictResolution: {
          strategy: 'user-priority',
          winningOperation: op2,
          losingOperation: op1
        }
      };
    }
  }

  private static resolveByTimestamp(
    op1: DocumentOperation,
    op2: DocumentOperation,
    context: TransformContext
  ): OperationTransformResult {
    if (op1.timestamp <= op2.timestamp) {
      return {
        transformedOperation: op1,
        requiresRebase: false,
        conflictResolution: {
          strategy: 'timestamp',
          winningOperation: op1,
          losingOperation: op2
        }
      };
    } else {
      return {
        transformedOperation: op1,
        requiresRebase: true,
        conflictResolution: {
          strategy: 'timestamp',
          winningOperation: op2,
          losingOperation: op1
        }
      };
    }
  }

  private static resolveByMerge(
    op1: DocumentOperation,
    op2: DocumentOperation,
    context: TransformContext
  ): OperationTransformResult {
    // Attempt to merge operations intelligently
    if (isInsertOperation(op1) && isDeleteOperation(op2)) {
      // Place insert at the start of the delete region
      return {
        transformedOperation: {
          ...op1,
          position: op2.position
        },
        requiresRebase: false,
        conflictResolution: {
          strategy: 'merge',
          winningOperation: op1,
          losingOperation: op2
        }
      };
    }

    // Default to timestamp resolution for other cases
    return this.resolveByTimestamp(op1, op2, context);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private static getConflictResolutionStrategy(
    op1: DocumentOperation,
    op2: DocumentOperation,
    context: TransformContext
  ): ConflictResolution['strategy'] {
    // Use context-defined strategy or default to timestamp
    return 'timestamp';
  }

  private static mergeAttributes(
    attr1: TextAttributes,
    attr2: TextAttributes
  ): TextAttributes {
    return {
      ...attr1,
      ...attr2
    };
  }

  private static areOperationsIdentical(
    op1: DocumentOperation,
    op2: DocumentOperation
  ): boolean {
    return op1.id === op2.id;
  }

  private static validateTransformResult(result: OperationTransformResult): void {
    if (!result.transformedOperation) {
      throw new OperationTransformError('Transform result is missing transformed operation');
    }

    if (result.transformedOperation.position < 0) {
      throw new OperationTransformError('Transformed operation has invalid position');
    }

    if (getOperationLength(result.transformedOperation) < 0) {
      throw new OperationTransformError('Transformed operation has invalid length');
    }
  }
}

// ============================================================================
// DOCUMENT STATE MANAGEMENT
// ============================================================================

export class DocumentStateManager {
  /**
   * Apply an operation to a document state
   */
  static applyOperation(
    state: DocumentState,
    operation: DocumentOperation
  ): DocumentState {
    try {
      const newContent = this.applyOperationToContent(state.content, operation);
      const newSpans = this.updateTextSpans(state.spans, operation);
      
      return {
        ...state,
        content: newContent,
        spans: newSpans,
        operations: [...state.operations, operation],
        version: state.version + 1,
        lastModified: Date.now()
      };
    } catch (error) {
      throw new OperationTransformError(
        `Failed to apply operation to document state: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { state, operation }
      );
    }
  }

  private static applyOperationToContent(
    content: string,
    operation: DocumentOperation
  ): string {
    switch (operation.type) {
      case 'insert':
        return (
          content.slice(0, operation.position) +
          operation.content +
          content.slice(operation.position)
        );
      
      case 'delete':
        return (
          content.slice(0, operation.position) +
          content.slice(operation.position + operation.length)
        );
      
      case 'retain':
      case 'format':
        return content; // Content doesn't change for retain/format
      
      default:
        return content;
    }
  }

  private static updateTextSpans(
    spans: import('@/types/collaborative-editor.types').TextSpan[],
    operation: DocumentOperation
  ): import('@/types/collaborative-editor.types').TextSpan[] {
    // Update text spans based on the operation
    // This is a simplified implementation - a full version would be more complex
    return spans.map(span => {
      if (operation.type === 'insert' && operation.position <= span.start) {
        return {
          ...span,
          start: span.start + operation.content.length,
          end: span.end + operation.content.length
        };
      } else if (operation.type === 'delete' && operation.position <= span.start) {
        const deleteEnd = operation.position + operation.length;
        if (deleteEnd <= span.start) {
          return {
            ...span,
            start: span.start - operation.length,
            end: span.end - operation.length
          };
        }
      }
      return span;
    });
  }

  /**
   * Calculate the difference between two document states
   */
  static calculateDiff(
    oldState: DocumentState,
    newState: DocumentState
  ): import('@/types/collaborative-editor.types').VersionDiff {
    const operations = newState.operations.slice(oldState.operations.length);
    
    return {
      operations,
      addedText: this.extractAddedText(operations),
      removedText: this.extractRemovedText(operations),
      modifiedFormatting: this.extractFormatChanges(operations),
      fromVersion: oldState.version,
      toVersion: newState.version
    };
  }

  private static extractAddedText(operations: DocumentOperation[]): import('@/types/collaborative-editor.types').TextChange[] {
    return operations
      .filter(isInsertOperation)
      .map(op => ({
        position: op.position,
        content: op.content,
        userId: op.userId,
        timestamp: op.timestamp
      }));
  }

  private static extractRemovedText(operations: DocumentOperation[]): import('@/types/collaborative-editor.types').TextChange[] {
    return operations
      .filter(isDeleteOperation)
      .map(op => ({
        position: op.position,
        content: `[${op.length} characters deleted]`,
        userId: op.userId,
        timestamp: op.timestamp
      }));
  }

  private static extractFormatChanges(operations: DocumentOperation[]): import('@/types/collaborative-editor.types').FormatChange[] {
    return operations
      .filter(isFormatOperation)
      .map(op => ({
        position: op.position,
        length: op.length,
        oldAttributes: {},
        newAttributes: op.attributes,
        userId: op.userId,
        timestamp: op.timestamp
      }));
  }
}