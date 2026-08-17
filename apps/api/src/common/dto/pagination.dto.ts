import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 100;

@InputType()
export class PaginationInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: DEFAULT_PAGE_LIMIT })
  limit?: number;
}

@ObjectType()
export class PaginationInfo {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field()
  hasMore: boolean;
}

export type ResolvedPagination = {
  page: number;
  limit: number;
  skip: number;
};

export function resolvePagination(
  input?: { page?: number; limit?: number } | null,
): ResolvedPagination {
  const page = Math.max(1, Math.floor(Number(input?.page)) || 1);
  const rawLimit = input?.limit;
  const parsedLimit =
    rawLimit === undefined || rawLimit === null
      ? DEFAULT_PAGE_LIMIT
      : Math.floor(Number(rawLimit));
  const limit = Math.min(
    MAX_PAGE_LIMIT,
    Math.max(1, parsedLimit || DEFAULT_PAGE_LIMIT),
  );
  return { page, limit, skip: (page - 1) * limit };
}

export function paginationInfo(
  total: number,
  page: number,
  limit: number,
): PaginationInfo {
  return {
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}

export function paginatedList<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): { items: T[] } & PaginationInfo {
  return {
    items,
    ...paginationInfo(total, page, limit),
  };
}
