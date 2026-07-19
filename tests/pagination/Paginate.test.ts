import { paginate, type PaginatedPage } from '../../src/pagination/paginate';

const collect = async <T>(gen: AsyncGenerator<T>): Promise<T[]> => {
  const items: T[] = [];
  for await (const item of gen) items.push(item);
  return items;
};

describe('paginate', () => {
  it('walks pages using total until exhausted', async () => {
    const fetchPage = jest.fn(async (startAt: number, maxResults: number): Promise<PaginatedPage<number>> => ({
      items: [startAt, startAt + 1].slice(0, Math.min(maxResults, 5 - startAt)),
      total: 5,
    }));
    const items = await collect(paginate(fetchPage, { pageSize: 2 }));
    expect(items).toEqual([0, 1, 2, 3, 4]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 2);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 2);
    expect(fetchPage).toHaveBeenNthCalledWith(3, 4, 2);
  });

  it('stops when isLast is true even without total', async () => {
    const pages: Array<PaginatedPage<string>> = [
      { items: ['a', 'b'], isLast: false },
      { items: ['c'], isLast: true },
    ];
    const fetchPage = jest.fn(async (): Promise<PaginatedPage<string>> => pages.shift() as PaginatedPage<string>);
    expect(await collect(paginate(fetchPage, { pageSize: 2 }))).toEqual(['a', 'b', 'c']);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('stops on a short page when the endpoint reports neither total nor isLast', async () => {
    const pages: Array<PaginatedPage<number>> = [{ items: [1, 2] }, { items: [3] }];
    const fetchPage = jest.fn(async (): Promise<PaginatedPage<number>> => pages.shift() ?? { items: [] });
    expect(await collect(paginate(fetchPage, { pageSize: 2 }))).toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('stops on an empty page', async () => {
    const fetchPage = jest.fn(async (): Promise<PaginatedPage<number>> => ({ items: [], total: 10 }));
    expect(await collect(paginate(fetchPage))).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('honors limit, stopping mid-page without fetching further', async () => {
    const fetchPage = jest.fn(async (startAt: number): Promise<PaginatedPage<number>> => ({
      items: [startAt, startAt + 1],
      total: 100,
    }));
    expect(await collect(paginate(fetchPage, { pageSize: 2, limit: 3 }))).toEqual([0, 1, 2]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('yields nothing for limit 0 without fetching', async () => {
    const fetchPage = jest.fn();
    expect(await collect(paginate(fetchPage as never, { limit: 0 }))).toEqual([]);
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('rejects invalid pageSize and limit', async () => {
    const fetchPage = async (): Promise<PaginatedPage<number>> => ({ items: [] });
    await expect(collect(paginate(fetchPage, { pageSize: 0 }))).rejects.toThrow(TypeError);
    await expect(collect(paginate(fetchPage, { pageSize: 1.5 }))).rejects.toThrow(TypeError);
    await expect(collect(paginate(fetchPage, { limit: -1 }))).rejects.toThrow(TypeError);
  });

  it('throws when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(new Error('cancelled'));
    const fetchPage = jest.fn();
    await expect(collect(paginate(fetchPage as never, { signal: controller.signal }))).rejects.toThrow('cancelled');
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('stops between pages when the signal aborts mid-iteration', async () => {
    const controller = new AbortController();
    const fetchPage = jest.fn(async (startAt: number): Promise<PaginatedPage<number>> => {
      controller.abort();
      return { items: [startAt], total: 10 };
    });
    await expect(collect(paginate(fetchPage, { pageSize: 1, signal: controller.signal }))).rejects.toThrow('Pagination aborted');
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
