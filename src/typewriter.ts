/** Frame-rate independent text reveal. Re-rendering the UI can retain its cursor. */
export class Typewriter {
  private characters: string[];
  private timer: number | null = null;
  private last: number;
  visibleCount: number;
  constructor(text: string, private options: {
    speed: number;
    start?: number;
    update: (visible: string) => void;
    complete: () => void;
    tick?: () => void;
  }) {
    this.characters = Array.from(text);
    this.visibleCount = Math.min(options.start ?? 0, this.characters.length);
    this.last = performance.now();
    options.update(this.characters.slice(0, this.visibleCount).join(""));
    if (!options.speed || this.isComplete) this.finish();
    else this.timer = window.setInterval(() => this.advance(), 16);
  }
  get isComplete() { return this.visibleCount >= this.characters.length; }
  private advance() {
    const now = performance.now();
    const count = Math.floor((now - this.last) / this.options.speed);
    if (count <= 0) return;
    this.last += count * this.options.speed;
    this.visibleCount = Math.min(this.characters.length, this.visibleCount + count);
    this.options.update(this.characters.slice(0, this.visibleCount).join(""));
    if (this.visibleCount % 3 === 0) this.options.tick?.();
    if (this.isComplete) { this.dispose(); this.options.complete(); }
  }
  finish() {
    this.dispose();
    this.visibleCount = this.characters.length;
    this.options.update(this.characters.join(""));
    this.options.complete();
  }
  dispose() { if (this.timer !== null) window.clearInterval(this.timer); this.timer = null; }
}
