import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  resolvePagination,
} from './pagination.dto';

describe('resolvePagination', () => {
  it('defaults to page 1 and limit 50', () => {
    expect(resolvePagination()).toEqual({
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
      skip: 0,
    });
  });

  it('caps limit at 100', () => {
    expect(resolvePagination({ page: 2, limit: 500 })).toEqual({
      page: 2,
      limit: MAX_PAGE_LIMIT,
      skip: MAX_PAGE_LIMIT,
    });
  });

  it('treats invalid values as defaults', () => {
    expect(resolvePagination({ page: 0, limit: 0 })).toEqual({
      page: 1,
      limit: DEFAULT_PAGE_LIMIT,
      skip: 0,
    });
  });
});
