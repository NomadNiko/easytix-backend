// src/utils/id-generator.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class IdGeneratorService {
  /**
   * Generate unique ID for queues in format: tq-XXXX
   * Where XXXX is a 4-digit padded number
   */
  generateQueueId(sequence: number): string {
    return `tq-${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Generate unique ID for categories in format: tc-XXXX
   * Where XXXX is a 4-digit padded number
   */
  generateCategoryId(sequence: number): string {
    return `tc-${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Extract sequence number from queue ID
   */
  extractQueueSequence(queueId: string): number {
    const match = queueId.match(/^tq-(\d{4})$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Extract sequence number from category ID
   */
  extractCategorySequence(categoryId: string): number {
    const match = categoryId.match(/^tc-(\d{4})$/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
