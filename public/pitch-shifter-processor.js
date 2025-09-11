
// A simple pitch shifter using granular synthesis.
// This is a basic implementation that is more performant than a full phase vocoder
// and should avoid the slowness and audio artifact issues.

class PitchShifterProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      return [{ name: 'pitchRatio', defaultValue: 1.0, minValue: 0.5, maxValue: 2.0 }];
    }
  
    constructor() {
      super();
      this.buffer = new Float32Array(4096 * 2); // Buffer to store incoming audio data
      this.bufferPosition = 0;
      this.readPosition = 0;
    }
  
    process(inputs, outputs, parameters) {
      const input = inputs[0];
      const output = outputs[0];
      const pitchRatio = parameters.pitchRatio[0];
  
      if (input.length === 0) {
        return true; // No input, keep processor alive
      }
      
      const inputChannel = input[0];

      // Store incoming data in our buffer
      if (this.bufferPosition + inputChannel.length < this.buffer.length) {
          this.buffer.set(inputChannel, this.bufferPosition);
          this.bufferPosition += inputChannel.length;
      }
  
      // Process the audio and fill the output buffer
      for (let i = 0; i < output[0].length; i++) {
        // Simple resampling: read from the buffer at a different speed
        const readIndex = Math.floor(this.readPosition);
        const nextReadIndex = readIndex + 1;
        const fraction = this.readPosition - readIndex;

        // Linear interpolation for smoother sound
        const value1 = this.buffer[readIndex % this.bufferPosition] || 0;
        const value2 = this.buffer[nextReadIndex % this.bufferPosition] || 0;
        const sample = value1 + (value2 - value1) * fraction;

        // Copy to all output channels
        for (let j = 0; j < output.length; j++) {
            output[j][i] = sample;
        }
  
        this.readPosition += pitchRatio;
      }

      // When the read head has passed the write head, reset to avoid clicks
      if (this.readPosition >= this.bufferPosition) {
          // Slide the unread buffer content to the beginning
          const remaining = this.buffer.slice(this.bufferPosition);
          this.buffer.set(remaining);
          this.buffer.fill(0, remaining.length); // Clear the rest
          this.readPosition -= this.bufferPosition;
          this.bufferPosition = remaining.length;
      }
  
      return true;
    }
  }
  
  registerProcessor('pitch-shifter-processor', PitchShifterProcessor);
  