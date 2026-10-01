/** Wall time has one owner: RAF while visible, one catch-up on resume. */
export class SessionClock {
  constructor(now) {
    this.last = now;
    this.hiddenAt = null;
    this.pausedWhileHidden = false;
  }
  frame(now) {
    const elapsed = Math.max(0, (now - this.last) / 1000);
    this.last = now;
    return this.hiddenAt === null ? elapsed : 0;
  }
  hide(now, transaction = false) {
    if (this.hiddenAt === null) {
      this.hiddenAt = now;
      this.pausedWhileHidden = transaction;
    }
    this.last = now;
  }
  resume(now) {
    const elapsed =
      this.hiddenAt === null || this.pausedWhileHidden
        ? 0
        : Math.max(0, (now - this.hiddenAt) / 1000);
    this.hiddenAt = null;
    this.last = now;
    this.pausedWhileHidden = false;
    return elapsed;
  }
}
