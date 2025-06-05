// src/tickets/dto/query-ticket.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TicketPriority, TicketStatus } from '../domain/ticket';

export class QueryTicketDto {
  // Pagination
  @ApiPropertyOptional({
    type: Number,
    default: 1,
    description: 'Page number for pagination',
  })
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    type: Number,
    default: 20,
    description: 'Number of items per page',
  })
  @Transform(({ value }) => (value ? Number(value) : 20))
  @IsNumber()
  @IsOptional()
  limit?: number;

  // Text search
  @ApiPropertyOptional({
    type: String,
    description: 'Text search across title, description, and comments',
  })
  @IsOptional()
  @IsString()
  search?: string;

  // Organizational filters (support multiple selections)
  @ApiPropertyOptional({
    type: [String],
    description: 'Array of queue IDs to filter by',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((id) => id.trim());
    }
    return value;
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  queueIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of category IDs to filter by',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((id) => id.trim());
    }
    return value;
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  // Status and Priority filters (support multiple selections)
  @ApiPropertyOptional({
    type: [String],
    enum: TicketStatus,
    description: 'Array of ticket statuses to filter by',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((status) => status.trim());
    }
    return value;
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TicketStatus, { each: true })
  statuses?: TicketStatus[];

  @ApiPropertyOptional({
    type: [String],
    enum: TicketPriority,
    description: 'Array of ticket priorities to filter by',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((priority) => priority.trim());
    }
    return value;
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TicketPriority, { each: true })
  priorities?: TicketPriority[];

  // User-related filters
  @ApiPropertyOptional({
    type: [String],
    description: 'Array of user IDs - tickets assigned to these users',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((id) => id.trim());
    }
    return value;
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedToUserIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of user IDs - tickets created by these users',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((id) => id.trim());
    }
    return value;
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  createdByUserIds?: string[];

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Show only unassigned tickets',
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsOptional()
  @IsBoolean()
  unassigned?: boolean;

  // Date range filters
  @ApiPropertyOptional({
    type: String,
    description: 'Filter tickets created after this date (ISO string)',
  })
  @IsOptional()
  @IsString()
  createdAfter?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Filter tickets created before this date (ISO string)',
  })
  @IsOptional()
  @IsString()
  createdBefore?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Filter tickets updated after this date (ISO string)',
  })
  @IsOptional()
  @IsString()
  updatedAfter?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Filter tickets updated before this date (ISO string)',
  })
  @IsOptional()
  @IsString()
  updatedBefore?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Filter tickets closed after this date (ISO string)',
  })
  @IsOptional()
  @IsString()
  closedAfter?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Filter tickets closed before this date (ISO string)',
  })
  @IsOptional()
  @IsString()
  closedBefore?: string;

  // Advanced content filters
  @ApiPropertyOptional({
    type: Boolean,
    description: 'Show only tickets that have document attachments',
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsOptional()
  @IsBoolean()
  hasDocuments?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Show only tickets that have comments/history',
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsOptional()
  @IsBoolean()
  hasComments?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Include archived/deleted tickets in results',
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsOptional()
  @IsBoolean()
  includeArchived?: boolean;

  // Result configuration
  @ApiPropertyOptional({
    type: String,
    enum: ['created', 'updated', 'priority', 'status', 'title'],
    description: 'Field to sort results by',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    type: String,
    enum: ['asc', 'desc'],
    description: 'Sort order (ascending or descending)',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  // Legacy support - these will be deprecated
  @ApiPropertyOptional({
    type: String,
    description: 'DEPRECATED: Use queueIds array instead',
  })
  @IsOptional()
  @IsString()
  queueId?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'DEPRECATED: Use categoryIds array instead',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    enum: TicketStatus,
    description: 'DEPRECATED: Use statuses array instead',
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({
    enum: TicketPriority,
    description: 'DEPRECATED: Use priorities array instead',
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({
    type: String,
    description: 'DEPRECATED: Use assignedToUserIds array instead',
  })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'DEPRECATED: Use createdByUserIds array instead',
  })
  @IsOptional()
  @IsString()
  createdById?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'DEPRECATED: Use assignedToUserIds or createdByUserIds instead',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((id) => id.trim());
    }
    return value;
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];
}
