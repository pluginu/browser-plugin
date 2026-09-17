import { migrate, validateState, STORAGE_KEY } from './model.js';
export function createRepository(area) {
  let queue = Promise.resolve();
  const read = async () => migrate((await area.get(STORAGE_KEY))[STORAGE_KEY]);
  const update = mutate => {
    const next = queue.then(async () => {
      const state = await read();
      await mutate(state);
      validateState(state);
      await area.set({ [STORAGE_KEY]: state });
      return state;
    });
    queue = next.catch(() => {});
    return next;
  };
  return { read, update, initialize: () => update(() => {}) };
}
