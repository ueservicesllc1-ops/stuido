
// Copyright (c) 2022, Tatsuya Yatagawa
// Copyright (c) 2023, Google LLC
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
//
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
//
// * Neither the name of the copyright holder nor the names of its
//   contributors may be used to endorse or promote products derived from
//   this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR
// IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
// FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
// DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
// OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

class PitchShifterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'pitchRatio',
        defaultValue: 1.0,
        minValue: 0.5,
        maxValue: 2.0,
      },
    ];
  }

  constructor(options) {
    super(options);

    this.hann = (i, N) => 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));

    this.fft = (real, imag) => {
      const N = real.length;
      if (N <= 1) return;

      const evenReal = new Array(N / 2);
      const evenImag = new Array(N / 2);
      const oddReal = new Array(N / 2);
      const oddImag = new Array(N / 2);

      for (let i = 0; i < N / 2; i++) {
        evenReal[i] = real[2 * i];
        evenImag[i] = imag[2 * i];
        oddReal[i] = real[2 * i + 1];
        oddImag[i] = imag[2 * i + 1];
      }

      this.fft(evenReal, evenImag);
      this.fft(oddReal, oddImag);

      for (let k = 0; k < N / 2; k++) {
        const tReal = oddReal[k];
        const tImag = oddImag[k];
        const angle = -2 * Math.PI * k / N;
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);
        oddReal[k] = tReal * cosAngle - tImag * sinAngle;
        oddImag[k] = tReal * sinAngle + tImag * cosAngle;

        real[k] = evenReal[k] + oddReal[k];
        imag[k] = evenImag[k] + oddImag[k];
        real[k + N / 2] = evenReal[k] - oddReal[k];
        imag[k + N / 2] = evenImag[k] - oddImag[k];
      }
    };

    this.ifft = (real, imag) => {
      const N = real.length;
      if (N <= 1) return;

      for (let i = 0; i < N; i++) {
        imag[i] *= -1;
      }

      this.fft(real, imag);

      for (let i = 0; i < N; i++) {
        real[i] /= N;
        imag[i] /= -N;
      }
    };
    
    // Initial values, will be configured in process method
    this.ola_step = 0; 
    this.fft_size = 0;
    this.channels = 0;

    this.frame_step = 0;
    this.in_fifo = [];
    this.out_fifo = [];
    this.fft_workspace_real = [];
    this.fft_workspace_imag = [];
    this.frame_real = [];
    this.frame_imag = [];
    this.out_frame_real = [];
    this.out_frame_imag = [];
    this.last_phase_in = [];
    this.last_phase_out = [];
  }
  
  init(channels, fft_size, ola_step) {
      if (this.fft_size === fft_size && this.channels === channels && this.ola_step === ola_step) {
        return;
      }
      this.ola_step = ola_step;
      this.fft_size = fft_size;
      this.channels = channels;
      this.frame_step = 0;

      this.in_fifo = Array(channels).fill(0).map(() => new Float32Array(fft_size).fill(0));
      this.out_fifo = Array(channels).fill(0).map(() => new Float32Array(fft_size).fill(0));

      this.fft_workspace_real = new Float32Array(fft_size).fill(0);
      this.fft_workspace_imag = new Float32Array(fft_size).fill(0);
      
      this.frame_real = new Float32Array(fft_size).fill(0);
      this.frame_imag = new Float32Array(fft_size).fill(0);

      this.out_frame_real = new Float32Array(fft_size).fill(0);
      this.out_frame_imag = new Float32Array(fft_size).fill(0);

      this.last_phase_in = Array(channels).fill(0).map(() => new Float32Array(fft_size / 2 + 1).fill(0));
      this.last_phase_out = Array(channels).fill(0).map(() => new Float32Array(fft_size / 2 + 1).fill(0));
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const pitchRatio = parameters.pitchRatio[0];

    const channels = input.length;
    if (channels === 0) return true;
    const fft_size = 4096;
    const ola_step = fft_size / 4;
    this.init(channels, fft_size, ola_step);
    
    for (let ch = 0; ch < this.channels; ++ch) {
      const in_ch = input[ch];
      const out_ch = output[ch];

      for (let i = 0; i < in_ch.length; ++i) {
        // out_ch[i] = 0; // Clear output buffer
        this.in_fifo[ch][this.frame_step] = in_ch[i];
        out_ch[i] = this.out_fifo[ch][this.frame_step - ola_step];
        this.frame_step++;

        if (this.frame_step >= fft_size) { // Process a frame
          this.frame_step = ola_step;

          // Shift FIFO
          for (let j = 0; j < fft_size - ola_step; ++j) {
            this.in_fifo[ch][j] = this.in_fifo[ch][j + ola_step];
            this.out_fifo[ch][j] = this.out_fifo[ch][j + ola_step];
          }
          for (let j = fft_size - ola_step; j < fft_size; ++j) {
            this.out_fifo[ch][j] = 0.0;
          }

          // Apply window
          for (let j = 0; j < fft_size; ++j) {
            this.fft_workspace_real[j] = this.in_fifo[ch][j] * this.hann(j, fft_size);
            this.fft_workspace_imag[j] = 0.0;
          }

          // FFT
          this.fft(this.fft_workspace_real, this.fft_workspace_imag);

          // Pitch shift
          for (let j = 0; j <= fft_size / 2; ++j) {
            const magnitude = Math.sqrt(this.fft_workspace_real[j] ** 2 + this.fft_workspace_imag[j] ** 2);
            const phase = Math.atan2(this.fft_workspace_imag[j], this.fft_workspace_real[j]);

            // Phase unwrapping
            const freq = (j * 2 * Math.PI) / fft_size;
            const freq_delta = freq - this.last_phase_in[ch][j];
            this.last_phase_in[ch][j] = freq;
            const unwrapped_freq = (freq_delta % Math.PI) + freq;
            
            const new_freq = unwrapped_freq * pitchRatio;
            const new_phase = this.last_phase_out[ch][j] + new_freq;
            this.last_phase_out[ch][j] = new_phase;
            
            this.frame_real[j] = magnitude * Math.cos(new_phase);
            this.frame_imag[j] = magnitude * Math.sin(new_phase);
          }
          
          // Zero padding for IFFT
          for(let j = fft_size / 2 + 1; j < fft_size; ++j) {
            this.frame_real[j] = 0.0;
            this.frame_imag[j] = 0.0;
          }

          // IFFT
          this.ifft(this.frame_real, this.frame_imag);

          // Overlap-add
          for (let j = 0; j < fft_size; ++j) {
            this.out_fifo[ch][j] += this.frame_real[j] * this.hann(j, fft_size);
          }
        }
      }
    }
    return true;
  }
}

registerProcessor('pitch-shifter-processor', PitchShifterProcessor);
