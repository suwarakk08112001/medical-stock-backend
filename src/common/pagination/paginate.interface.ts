export interface PaginationOptions {
  page: number;
  limit: number;
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  [key: string]: unknown; // รองรับ extra fields เช่น createCount
}

// export interface PaginatedResult<T> {
//   data: T[];
//   meta: {
//     total: number;
//     lastPage: number;
//     currentPage: number;
//     perPage: number;
//   };
// }

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
