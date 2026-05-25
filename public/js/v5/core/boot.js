const DEFAULT_BOOT_TIMEOUT_MS = 10_000;

export function withTimeout(promise, timeoutMs, label) {
  let timerId;
  const timeoutError = new Error(`${label} timed out after ${timeoutMs}ms`);

  const timeout = new Promise((_, reject) => {
    timerId = globalThis.setTimeout(() => reject(timeoutError), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timerId !== undefined) globalThis.clearTimeout(timerId);
  });
}

export async function runBootSequence({
  initOpenHome,
  revealShell,
  showBootFailure,
  timeoutMs = DEFAULT_BOOT_TIMEOUT_MS,
  label = "STRATO home boot",
} = {}) {
  try {
    await withTimeout(Promise.resolve().then(() => initOpenHome()), timeoutMs, label);
    revealShell();
  } catch (error) {
    showBootFailure(error);
    revealShell();
  }
}
