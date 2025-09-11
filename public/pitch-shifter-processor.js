
// Copyright 2022 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// This is an implementation of a phase vocoder in an AudioWorkletProcessor.
// It is based on the "Jungle" audio worklet example by Google Chrome Labs.
// It changes the pitch of an audio stream without changing the tempo.

const hannWindow = (length) => {
  const window = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (length - 1)));
  }
  return window;
};

class PitchShifterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{
      name: 'pitchRatio',
      defaultValue: 1.0,
      minValue: 0.25,
      maxValue: 4.0
    }];
  }

  constructor(options) {
    super(options);

    this.grainSize = 1024;
    this.hopSize = this.grainSize / 4;
    this.fftSize = this.grainSize;

    // Internal buffers
    this.inputBuffer = new Float32Array(this.grainSize * 2);
    this.outputBuffer = new Float32Array(this.grainSize * 2);
    this.grainWindow = hannWindow(this.grainSize);

    // FFT related
    this.fft = new RFFT(this.fftSize);
    this.freqDomain = new Float32Array(this.fft.fftSize / 2 + 1);
    this.phaseAccum = new Float32Array(this.fft.fftSize / 2 + 1);
    this.prevPhase = new Float32Array(this.fft.fftSize / 2 + 1);
    this.magnitude = new Float32Array(this.fft.fftSize / 2 + 1);
    
    this.inputBufferPos = 0;
    this.outputBufferPos = 0;
    this.sumOfSquares = 0;

    this.port.onmessage = (event) => {
       // console.log('PitchShifterProcessor received message:', event.data);
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const pitchRatio = parameters.pitchRatio[0];

    // For simplicity, we'll process only the first channel (mono).
    const inputChannel = input[0];

    if (!inputChannel) {
      return true; // Keep processor alive if no input
    }
    
    // Copy input samples to our internal buffer.
    for (let i = 0; i < inputChannel.length; i++) {
      this.inputBuffer[this.inputBufferPos++] = inputChannel[i];
      
      // When the buffer is full enough for a grain, process it.
      if (this.inputBufferPos >= this.grainSize) {
        // 1. Window the grain
        const grain = new Float32Array(this.grainSize);
        for(let j=0; j<this.grainSize; j++) {
            grain[j] = this.inputBuffer[j] * this.grainWindow[j];
        }

        // 2. FFT to get frequency and phase
        const spectrum = this.fft.forward(grain);
        
        // 3. Pitch shifting in the frequency domain
        for (let j = 0; j <= this.fftSize / 2; j++) {
            const magnitude = Math.sqrt(spectrum[2 * j] * spectrum[2 * j] + spectrum[2 * j + 1] * spectrum[2 * j + 1]);
            const phase = Math.atan2(spectrum[2 * j + 1], spectrum[2 * j]);

            // Calculate frequency deviation
            const deltaPhase = phase - this.prevPhase[j];
            this.prevPhase[j] = phase;
            
            const freq = (deltaPhase + 2 * Math.PI * Math.round((this.hopSize * j / this.fftSize) - deltaPhase / (2*Math.PI)) ) / (2 * Math.PI) * (sampleRate / this.hopSize);

            // Synthesize new phase
            this.phaseAccum[j] += 2 * Math.PI * freq * pitchRatio / sampleRate * this.hopSize;
            
            // Output spectrum
            spectrum[2 * j] = magnitude * Math.cos(this.phaseAccum[j]);
            spectrum[2 * j + 1] = magnitude * Math.sin(this.phaseAccum[j]);
        }
        
        // 4. IFFT to get the time domain signal
        const processedGrain = this.fft.inverse(spectrum);

        // 5. Overlap-add to the output buffer
        for(let j=0; j<this.grainSize; j++) {
            this.outputBuffer[j] += processedGrain[j] * this.grainWindow[j];
        }
        
        // Shift input buffer
        this.inputBuffer.copyWithin(0, this.hopSize, this.grainSize);
        this.inputBufferPos -= this.hopSize;

        // Copy a block of output to the actual output channel
        for(let k=0; k < this.hopSize; k++) {
            for(let channel = 0; channel < output.length; channel++) {
              if(output[channel]) {
                // To avoid being too loud, we can normalize it slightly
                output[channel][k] = this.outputBuffer[k] * 0.8;
              }
            }
        }
        
        // Shift output buffer
        this.outputBuffer.copyWithin(0, this.hopSize, this.grainSize * 2);
        // Clear the end of the output buffer
        for(let j = this.grainSize; j < this.grainSize * 2; j++) {
            this.outputBuffer[j] = 0;
        }
      }
    }
    
    // We processed less than a full block, so we need to fill the rest of the output block
    // to match the input block size.
    const remaining = inputChannel.length;
    for (let channel = 0; channel < output.length; channel++) {
        if (!output[channel]) continue;
        for (let i = this.hopSize; i < remaining; i++) {
             // This can cause some artifacts, a better implementation would handle this more gracefully
             // but for now, we just pass through or zero out.
             output[channel][i] = 0; // or inputChannel[i] if passthrough is desired.
        }
    }


    return true;
  }
}

// RFFT implementation (from a public source, often used in vocoders)
// This is a basic implementation for educational purposes.
class RFFT {
  constructor(size) {
    this.fftSize = size;
    this.trans = new Float32Array(size);
    this.cos_table = new Float32Array(size / 2);
    this.sin_table = new Float32Array(size / 2);
    for (let i = 0; i < size / 2; i++) {
      this.cos_table[i] = Math.cos(2 * Math.PI * i / size);
      this.sin_table[i] = Math.sin(2 * Math.PI * i / size);
    }
  }

  forward(buffer) {
    const size = this.fftSize;
    let i, j, k, p, q, i1, i2, i3, i4;
    let s, c, tr, ti;

    for (i = 0; i < size; i++) {
      this.trans[i] = buffer[i];
    }
    
    for (i = 0, j = 0; i < size - 1; i++) {
      if (i < j) {
        [this.trans[i], this.trans[j]] = [this.trans[j], this.trans[i]];
      }
      k = size >> 1;
      while (k <= j) {
        j -= k;
        k >>= 1;
      }
      j += k;
    }
    
    for (p = 2; p <= size; p <<= 1) {
      i3 = p >> 1;
      for (k = 0; k < i3; k++) {
        c = this.cos_table[k * (size / p)];
        s = this.sin_table[k * (size / p)];
        i4 = p;
        for (j = k; j < size; j += i4) {
          i1 = j;
          i2 = i1 + i3;
          tr = this.trans[i2] * c - this.trans[i2+1] * s;
          ti = this.trans[i2] * s + this.trans[i2+1] * c;
          this.trans[i2] = this.trans[i1] - tr;
          this.trans[i2+1] = this.trans[i1+1] - ti;
          this.trans[i1] += tr;
          this.trans[i1+1] += ti;
        }
      }
    }
    
    // The output is interleaved: [real0, imag0, real1, imag1, ...]
    // But for a real FFT, imag0 and imag(n/2) are 0. Let's make it simpler.
    const spectrum = new Float32Array(size + 2);
    for(i=0; i<size/2; i++) {
        spectrum[2*i] = this.trans[2*i];
        spectrum[2*i+1] = this.trans[2*i+1];
    }
    return spectrum;
  }
  
  inverse(spectrum) {
    const size = this.fftSize;
    let i, j, k, p, q, i1, i2, i3, i4;
    let s, c, tr, ti;

    // Prepare for IFFT
    for(i=0; i<size/2; i++) {
      this.trans[2*i] = spectrum[2*i];
      this.trans[2*i+1] = spectrum[2*i+1];
    }

    for (p = 2; p <= size; p <<= 1) {
      i3 = p >> 1;
      for (k = 0; k < i3; k++) {
        c = this.cos_table[k * (size / p)];
        s = -this.sin_table[k * (size / p)]; // Negate sine for IFFT
        i4 = p;
        for (j = k; j < size; j += i4) {
          i1 = j;
          i2 = i1 + i3;
          tr = this.trans[i2] * c - this.trans[i2+1] * s;
          ti = this.trans[i2] * s + this.trans[i2+1] * c;
          this.trans[i2] = this.trans[i1] - tr;
          this.trans[i2+1] = this.trans[i1+1] - ti;
          this.trans[i1] += tr;
          this.trans[i1+1] += ti;
        }
      }
    }

    for (i = 0, j = 0; i < size - 1; i++) {
      if (i < j) {
        [this.trans[i], this.trans[j]] = [this.trans[j], this.trans[i]];
        [this.trans[i+1], this.trans[j+1]] = [this.trans[j+1], this.trans[i+1]];
      }
      k = size >> 1;
      while (k <= j) {
        j -= k;
        k >>= 1;
      }
      j += k;
    }
    
    const buffer = new Float32Array(size);
    for(i=0; i<size; i++) {
      buffer[i] = this.trans[i] / (size/2);
    }
    return buffer;
  }
}

registerProcessor('pitch-shifter-processor', PitchShifterProcessor);
