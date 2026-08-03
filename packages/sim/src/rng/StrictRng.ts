export class StrictRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    const index = this.nextInt(0, items.length - 1);
    const item = items[index];
    if (item === undefined) {
      throw new Error('Pick index out of bounds');
    }
    return item;
  }

  fork(streamKey: string): StrictRng {
    let hash = 0;
    for (let i = 0; i < streamKey.length; i++) {
      hash = (Math.imul(31, hash) + streamKey.charCodeAt(i)) | 0;
    }
    return new StrictRng((this.state ^ hash) >>> 0);
  }
}

export class RngStreamRegistry {
  private readonly root: StrictRng;
  private readonly streams = new Map<string, StrictRng>();

  constructor(seed: number) {
    this.root = new StrictRng(seed);
  }

  getStream(key: string): StrictRng {
    let stream = this.streams.get(key);
    if (!stream) {
      stream = this.root.fork(key);
      this.streams.set(key, stream);
    }
    return stream;
  }
}
