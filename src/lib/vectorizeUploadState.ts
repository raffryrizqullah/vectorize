type Listener = (uploading: boolean, inFlight: number) => void;

class VectorizeUploadState {
  private inFlight = 0;
  private listeners = new Set<Listener>();

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    // call immediately with current state
    fn(this.uploading, this.inFlight);
    return () => this.listeners.delete(fn);
  }

  get uploading() {
    return this.inFlight > 0;
  }

  begin() {
    this.inFlight += 1;
    this.emit();
  }

  end() {
    this.inFlight = Math.max(0, this.inFlight - 1);
    this.emit();
  }

  private emit() {
    const state = this.uploading;
    for (const fn of this.listeners) fn(state, this.inFlight);
  }
}

export const vectorizeUploadState = new VectorizeUploadState();

