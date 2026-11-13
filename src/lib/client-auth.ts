export async function performSignOut(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      signal:
        typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
          ? AbortSignal.timeout(4000)
          : undefined,
    });
  } catch {
    // Ignore network or timeout errors; hard navigation below completes sign-out cleanly
  } finally {
    window.location.replace(new URL('/login', window.location.origin).href);
  }
}
