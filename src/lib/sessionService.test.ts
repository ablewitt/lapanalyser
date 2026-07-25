import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveActiveSessionIds, loadActiveSessionIds, pruneInaccessibleIds,
  clearOrphanedPersistedState,
} from './sessionService';

// Minimal in-memory Storage for the node test environment (no DOM).
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(key: string) { return this.map.has(key) ? this.map.get(key)! : null; }
  setItem(key: string, value: string) { this.map.set(key, String(value)); }
  removeItem(key: string) { this.map.delete(key); }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
}

const USER = 'user-abc';
const KEY = `la_active:${USER}`;

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
});

describe('active session persistence', () => {
  it('round-trips ids through sessionStorage', () => {
    saveActiveSessionIds(USER, ['a', 'b', 'c']);
    expect(loadActiveSessionIds(USER)).toEqual(['a', 'b', 'c']);
    expect(sessionStorage.getItem(KEY)).toBe('["a","b","c"]');
  });

  it('never writes to localStorage (multi-tab safety)', () => {
    saveActiveSessionIds(USER, ['a', 'b']);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('returns [] when nothing is saved', () => {
    expect(loadActiveSessionIds(USER)).toEqual([]);
  });

  it('scopes storage per user id', () => {
    saveActiveSessionIds('user-1', ['x']);
    saveActiveSessionIds('user-2', ['y']);
    expect(loadActiveSessionIds('user-1')).toEqual(['x']);
    expect(loadActiveSessionIds('user-2')).toEqual(['y']);
  });

  it('caps the stored list at 10 ids', () => {
    const ids = Array.from({ length: 15 }, (_, i) => `id-${i}`);
    saveActiveSessionIds(USER, ids);
    expect(loadActiveSessionIds(USER)).toHaveLength(10);
    expect(loadActiveSessionIds(USER)[0]).toBe('id-0');
  });

  it('recovers gracefully from corrupt JSON', () => {
    sessionStorage.setItem(KEY, '{not valid json');
    expect(loadActiveSessionIds(USER)).toEqual([]);
  });
});

describe('pruneInaccessibleIds (self-heal)', () => {
  it('keeps ids that are still accessible', () => {
    expect(pruneInaccessibleIds(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('drops an id that is gone — deleted / unshared / made private', () => {
    // 'b' was in the saved list but fetchSessionsByIds (RLS) no longer returns it
    expect(pruneInaccessibleIds(['a', 'b', 'c'], ['a', 'c'])).toEqual(['a', 'c']);
  });

  it('drops all ids when none are accessible', () => {
    expect(pruneInaccessibleIds(['a', 'b'], [])).toEqual([]);
  });

  it('preserves the original order of surviving ids', () => {
    expect(pruneInaccessibleIds(['c', 'a', 'b'], ['b', 'a'])).toEqual(['a', 'b']);
  });

  it('ignores accessible ids that were never saved', () => {
    expect(pruneInaccessibleIds(['a'], ['a', 'x', 'y'])).toEqual(['a']);
  });
});

describe('clearOrphanedPersistedState', () => {
  it('removes orphaned la_active:* and la_selection keys, leaving others', () => {
    localStorage.setItem('la_active:user-1', '["a"]');
    localStorage.setItem('la_active:user-2', '["b"]');
    localStorage.setItem('la_selection', '{"selectedLapIds":[]}');
    localStorage.setItem('unrelated', 'keep-me');

    clearOrphanedPersistedState();

    expect(localStorage.getItem('la_active:user-1')).toBeNull();
    expect(localStorage.getItem('la_active:user-2')).toBeNull();
    expect(localStorage.getItem('la_selection')).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('keep-me');
  });

  it('does not touch sessionStorage (the live store)', () => {
    saveActiveSessionIds(USER, ['a', 'b']);
    localStorage.setItem('la_selection', 'orphan');

    clearOrphanedPersistedState();

    expect(loadActiveSessionIds(USER)).toEqual(['a', 'b']);
  });
});
