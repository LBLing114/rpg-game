// Quiet procedural rain and a low, sparse drone. Audio starts only after a gesture.
export class Ambience {
  context: AudioContext | null = null;
  volume: GainNode | null = null;
  enabled = false;
  async toggle() {
    if (!this.context) {
      this.context = new AudioContext();
      this.volume = this.context.createGain();
      this.volume.gain.value = 0;
      this.volume.connect(this.context.destination);
      const buffer = this.context.createBuffer(
        1,
        this.context.sampleRate * 4,
        this.context.sampleRate,
      );
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + Math.random() * 0.04 - 0.02) / 1.02;
        data[i] = last * 3;
      }
      const rain = this.context.createBufferSource();
      rain.buffer = buffer;
      rain.loop = true;
      const filter = this.context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 850;
      rain.connect(filter);
      filter.connect(this.volume);
      rain.start();
      for (const hz of [110, 164.81]) {
        const oscillator = this.context.createOscillator(),
          gain = this.context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = hz;
        gain.gain.value = 0.012;
        oscillator.connect(gain);
        gain.connect(this.volume);
        oscillator.start();
      }
    }
    await this.context.resume();
    this.enabled = !this.enabled;
    this.volume!.gain.setTargetAtTime(
      this.enabled ? 0.45 : 0,
      this.context.currentTime,
      0.3,
    );
    return this.enabled;
  }
}
