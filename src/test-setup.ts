// Zustand persist defaults to window.localStorage — provide both globals for Node
const store = new Map<string, string>();

const storage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => { store.set(key, value); },
  removeItem: (key: string) => { store.delete(key); },
  clear: () => { store.clear(); },
  get length() { return store.size; },
  key: (index: number) => [...store.keys()][index] ?? null,
};

// Zustand's createJSONStorage accesses window.localStorage
if (typeof window === "undefined") {
  (globalThis as any).window = globalThis;
}
(globalThis as any).localStorage = storage;
