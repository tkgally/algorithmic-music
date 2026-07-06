Create a browser-based generative polyphonic synthesizer that automatically composes and plays evolving musical pieces. The synthesizer should create music where multiple voices interact through both harmony and contrast, creating an organic, living musical experience.

**Core Requirements:**

1. **Automatic Music Generation**: The synthesizer should continuously generate new musical phrases and patterns.

2. **Polyphonic Voice System**: Implement 2-6 independent voices that:
   - Each have their own melodic patterns and rhythmic behaviors
   - Interact through call-and-response, harmonization, and counterpoint
   - Sometimes converge into unison or harmony, other times diverge into contrasting patterns
   - Use different timbres/waveforms to create sonic variety
   - Make the timbre/waveform of each voice continuously controllable by the user through multiple parameters

3. **Creative Control Parameters** (avoid standard synth controls like ADSR envelopes):
   - **Conversation Density**: How much the voices "talk" to each other vs play independently
   - **Emotional Temperature**: Shifts the overall mood from contemplative/sparse to energetic/dense
   - **Pattern Memory**: How much voices remember and repeat previous phrases vs generate new material
   - **Harmonic Magnetism**: How strongly voices are pulled toward consonant intervals vs exploring dissonance
   - **Rhythmic Elasticity**: From rigid grid-based timing to fluid, rubato-like timing
   - **Voice Evolution**: Adjusts how much the timbre/waveform of each voice transforms over time
   - **Evolutionary Rate**: How quickly the melodies and timbre/waveform transforms over time

4. **Technical Implementation**:
   - Use Web Audio API for sound synthesis
   - Create a musical AI that makes intelligent decisions about note choices based on:
     - Current harmonic context
     - Recent melodic patterns
     - Interaction with other voices
     - User parameter settings

6. **User Experience**:
   - All controls should use creative metaphors rather than technical terms
   - Include hover tooltips that explain each control in musical/poetic language
   - Add a "Freeze Moment" button that captures particularly beautiful combinations
   - Include subtle randomization so the music never exactly repeats

The overall goal is to create an instrument that feels more like conducting a conversation between musical entities than operating a traditional synthesizer. Users should be able to guide the musical journey through intuitive controls while still being surprised by emergent musical moments.

Make it work entirely in a HTML file with linked CSS and JavaScript files in the same directory. Use NO external dependencies. Use modern, clean visual design. The music should start playing when the user presses a Start button.