/**
 * useOnlineStatus Hook Tests
 *
 * Testing online/offline status detection hook
 */

import { renderHook, act } from '@testing-library/react';
import useOnlineStatus from './useOnlineStatus';

describe('useOnlineStatus', () => {
  let onlineListener;
  let offlineListener;

  beforeEach(() => {
    // Save original event listeners
    onlineListener = null;
    offlineListener = null;

    // Mock addEventListener
    window.addEventListener = jest.fn((event, handler) => {
      if (event === 'online') onlineListener = handler;
      if (event === 'offline') offlineListener = handler;
    });

    // Mock removeEventListener
    window.removeEventListener = jest.fn();

    // Mock navigator.onLine
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns online status initially', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  test('returns offline status when navigator.onLine is false', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  test('updates status when going offline', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false,
      });
      if (offlineListener) offlineListener();
    });

    expect(result.current).toBe(false);
  });

  test('updates status when going online', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: true,
      });
      if (onlineListener) onlineListener();
    });

    expect(result.current).toBe(true);
  });

  test('registers event listeners on mount', () => {
    renderHook(() => useOnlineStatus());

    expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  test('cleans up event listeners on unmount', () => {
    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});
