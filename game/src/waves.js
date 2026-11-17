// waves.js — the seven nights. Each night is a plan: how many of the Murk come,
// how tough and quick they are, and how often one slips out of a portal. Night 1
// is a teaching trickle; by night 7 the east is a river of dark.

export function nightPlan(n) {
  return {
    night: n,
    count: 6 + 4 * n,                              // 10, 14, 18, 22, 26, 30, 34
    hpMul: 1 + 0.22 * (n - 1),
    spMul: 1 + 0.05 * (n - 1),
    swiftShare: n >= 2 ? 0.25 : 0,
    bruteShare: n >= 3 ? 0.10 + 0.02 * n : 0,
    interval: Math.max(0.55, 1.5 - 0.13 * n),
    clearBonus: 30 + 5 * n,
  };
}

export const NIGHTS = 7;
