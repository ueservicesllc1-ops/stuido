
/**
 * @class PitchShifterProcessor
 * @extends AudioWorkletProcessor
 *
 * This processor implements a real-time pitch shifter using a phase vocoder algorithm.
 * It changes the pitch of an audio stream without altering its duration.
 *
 * It is based on the "smbPitchShift" algorithm by Stephan M. Bernsee.
 * The original C code can be found at: http://blogs.zynaptiq.com/bernsee/pitch-shifting-using-the-ft/
 * This TypeScript/JavaScript port is adapted from various web implementations.
 *
 * Key parameters:
 * - `pitchRatio`: The factor by which to shift the pitch. > 1.0 for higher, < 1.0 for lower.
 * - `fftSize`: The size of the Fast Fourier Transform, determines frequency resolution.
 * - `hopSize`: The step size between FFT windows. Overlap is `fftSize - hopSize`.
 */
class PitchShifterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{
      name: 'pitchRatio',
      defaultValue: 1.0,
      minValue: 0.5,
      maxValue: 2.0,
      automationRate: 'k-rate' // Can't be changed per sample, only per block
    }];
  }

  constructor(options) {
    super(options);

    this.fftSize = 2048;
    this.hopSize = this.fftSize / 4;
    this.sampleRate = sampleRate;

    // Buffers and state variables
    this.inputBuffer = new Float32Array(this.fftSize * 2);
    this.outputBuffer = new Float32Array(this.fftSize * 2);
    this.fftWindow = new Float32Array(this.fftSize);

    // FFT analysis data
    this.magnitudes = new Float32Array(this.fftSize / 2 + 1);
    this.frequencies = new Float32Array(this.fftSize / 2 + 1);
    this.lastInputPhases = new Float32Array(this.fftSize / 2 + 1);
    this.lastOutputPhases = new Float32Array(this.fftSize / 2 + 1);

    this.inputBufferPos = 0;
    this.outputBufferPos = 0;
    this.outputBufferLag = this.fftSize - this.hopSize;
    
    // Pre-calculate the Hanning window
    for (let i = 0; i < this.fftSize; i++) {
      this.fftWindow[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / this.fftSize));
    }

    this.twoPi = 2 * Math.PI;
    this.freqPerBin = this.sampleRate / this.fftSize;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const pitchRatio = parameters.pitchRatio[0];

    const inputChannel = input[0];
    const outputChannel = output[0];

    if (!inputChannel) {
        return true;
    }

    for (let i = 0; i < inputChannel.length; i++) {
      // 1. Add new samples to the input buffer
      this.inputBuffer[this.inputBufferPos] = inputChannel[i];
      this.inputBufferPos++;
      
      // 2. Once the buffer has enough data for a hop, process a frame
      if (this.inputBufferPos >= this.hopSize) {
        this.processFrame(pitchRatio);
        
        // Shift buffer to make space for the next hop
        this.inputBuffer.copyWithin(0, this.hopSize, this.fftSize);
        this.inputBufferPos -= this.hopSize;
      }
      
      // 3. Get the oldest sample from the output buffer
      outputChannel[i] = this.outputBuffer[this.outputBufferPos];
      this.outputBufferPos++;

      // 4. If we've read past the lag, shift the output buffer
      if (this.outputBufferPos >= this.outputBufferLag) {
        this.outputBuffer.copyWithin(0, this.outputBufferLag, this.fftSize * 2);
        this.outputBufferPos -= this.outputBufferLag;
      }
    }

    return true;
  }
  
  processFrame(pitchRatio) {
    const frame = new Float32Array(this.fftSize);
    
    // Apply Hanning window to the current frame from the input buffer
    for(let i=0; i < this.fftSize; i++) {
        frame[i] = this.inputBuffer[i] * this.fftWindow[i];
    }
    
    // Perform FFT (complex interleaved array)
    const complexFrame = this.fft(frame);

    // Analyze FFT data to get magnitudes and frequencies
    for (let i = 0; i <= this.fftSize / 2; i++) {
      const real = complexFrame[2 * i];
      const imag = complexFrame[2 * i + 1];

      // Magnitude
      this.magnitudes[i] = 2 * Math.sqrt(real * real + imag * imag);

      // Phase
      const phase = Math.atan2(imag, real);
      
      // Phase deviation
      let deltaPhase = phase - this.lastInputPhases[i];
      this.lastInputPhases[i] = phase;
      
      // Frequency deviation
      let deltaFreq = deltaPhase * this.hopSize / this.twoPi;

      // Expected frequency for this bin
      let expectedFreq = i * this.freqPerBin;
      
      // Actual frequency
      let freq = expectedFreq + deltaFreq * this.freqPerBin;

      // Store the actual frequency
      this.frequencies[i] = freq * pitchRatio;
    }
    
    // --- Synthesis ---
    const synthComplexFrame = new Float32Array(this.fftSize * 2).fill(0);

    for (let i = 0; i <= this.fftSize / 2; i++) {
      const magnitude = this.magnitudes[i];
      const freq = this.frequencies[i];
      
      // Phase propagation
      let deltaPhase = (freq - (i * this.freqPerBin)) / this.freqPerBin * this.hopSize * this.twoPi;
      let newPhase = this.lastOutputPhases[i] + deltaPhase;
      this.lastOutputPhases[i] = newPhase;

      // Convert back to complex number
      synthComplexFrame[2 * i] = magnitude * Math.cos(newPhase);
      synthComplexFrame[2 * i + 1] = magnitude * Math.sin(newPhase);
    }
    
    // Perform Inverse FFT
    const synthFrame = this.ifft(synthComplexFrame);
    
    // Overlap-add to the output buffer
    for (let i = 0; i < this.fftSize; i++) {
        this.outputBuffer[i] += synthFrame[i] * this.fftWindow[i];
    }
  }


  // Basic FFT implementation (Cooley-Tukey Radix-2)
  // This is not optimized, but sufficient for a worklet.
  fft(x) {
    const N = x.length;
    if (N <= 1) return x;

    const even = this.fft(x.filter((_, i) => i % 2 === 0));
    const odd = this.fft(x.filter((_, i) => i % 2 !== 0));

    const result = new Float32Array(N * 2);
    for (let k = 0; k < N / 2; k++) {
        const t_real = odd[2 * k];
        const t_imag = odd[2 * k + 1];

        const angle = -this.twoPi * k / N;
        const cos_angle = Math.cos(angle);
        const sin_angle = Math.sin(angle);

        const rotated_real = t_real * cos_angle - t_imag * sin_angle;
        const rotated_imag = t_real * sin_angle + t_imag * cos_angle;
        
        result[2*k] = even[2*k] + rotated_real;
        result[2*k+1] = even[2*k+1] + rotated_imag;
        
        result[2*(k+N/2)] = even[2*k] - rotated_real;
        result[2*(k+N/2)+1] = even[2*k+1] - rotated_imag;
    }
    return result;
  }
  
  ifft(complex) {
    const N = complex.length / 2;
    const result = new Float32Array(N);
    const tempComplex = new Float32Array(N*2);

    // Conjugate input
    for(let i=0; i<N; i++) {
        tempComplex[2*i] = complex[2*i];
        tempComplex[2*i+1] = -complex[2*i+1];
    }

    // FFT
    let fftResult = this.fft(tempComplex.filter((_, i) => i % 2 === 0));

    // Conjugate and scale output
    for(let i=0; i<N; i++) {
        result[i] = fftResult[2*i] / N;
    }

    return result;
  }

}

registerProcessor('pitch-shifter-processor', PitchShifterProcessor);
