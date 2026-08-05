import { PaginationOptions, PaginatedResult } from './paginate.interface';

export function calculatePagination(options: PaginationOptions) {
  const { page, limit } = options;
  const skip = (page - 1) * limit;
  const take = limit;

  return { skip, take };
}

export function createPaginatedResult<T>(
  data: T[],
  total: number,
  options: PaginationOptions,
): PaginatedResult<T> {
  const { page, limit } = options;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
  };
}

export async function paginate<T>(
  queryFn: (skip: number, take: number) => Promise<T[]>,
  countFn: () => Promise<number>,
  options: { page?: number; limit?: number },
) {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 10;

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([queryFn(skip, limit), countFn()]);

  const totalPages = Math.ceil(total / limit); // ✅ เพิ่มตรงนี้

  return {
    data,
    total,
    page,
    limit,
    totalPages, // ✅ ใส่เข้าไป
  };
}
