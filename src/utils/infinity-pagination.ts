import { IPaginationOptions } from './types/pagination-options';
import { InfinityPaginationResponseDto } from './dto/infinity-pagination-response.dto';

export const infinityPagination = <T>(
  data: T[],
  options: IPaginationOptions,
  total?: number,
): InfinityPaginationResponseDto<T> => {
  return {
    data,
    hasNextPage: data.length === options.limit,
    total,
  };
};
