# Lamphone: Passive Sound Recovery from a Desk Lamp's Light Bulb Vibrations
(authored by agents unless marked 🧑)
Tag: `nassi2022lamphone`, [paper](https://www.usenix.org/conference/usenixsecurity22/presentation/nassi)

## scope and threat model
Lamphone recovers sound by observing sound-induced light-bulb vibrations with a telescope and electro-optical sensor. The authors describe the mechanism: “We show how fluctuations in the air pressure on the surface of a light bulb, which occur in response to sound and cause the bulb to vibrate very slightly (a millidegree vibration), can be exploited by eavesdroppers to recover speech passively, externally, and using equipment that provides no indication regarding its application.” (Abstract, p. 4401)

Section 3 assumes a victim on a phone call or virtual meeting, up to 50 cm from a lamp's bulb, and an eavesdropper within 35 m of the room (p. 4402). The attack requires visibility of the bulb: “is an external method that relies on a line of sight between the electro-optical sensor and the light bulb” (Section 3, p. 4403). The telescope focuses the view; a photodiode converts captured light to current; an analog-to-digital converter (ADC) samples the sensor output; software recovers audio (Section 3, pp. 4402–4403).

Inference: Verus could verify contracts for a digital implementation, but the physical coupling between sound, bulb motion, and measured light would require an explicit model or remain an assumption.

## technique 1: optical measurement and frequency characterization
The paper separately measures bulb motion, characterizes the sensor's response to distance, and tests optical responses to sound. A gyroscope sampled at 700 Hz measures an unilluminated 10 W E14 LED bulb under 150, 200, 250, 300, and 350 Hz tones at 60 and 70 dB. Reported angular changes are 2–35 millidegrees; calculated movement is 17–55 microns (Section 4.1.1, p. 4404). The optical experiment uses a 12 W E14 LED bulb and sensor measurements from 1–9 m (Section 4.1.2, pp. 4404–4405). The authors explain: “The experiments conducted in this section show that the intensity of the light captured by an electro-optical sensor changes as a function of the distance between the light bulb and the electro-optical sensor.” (Section 4.3, p. 4406)

The optical characterization proceeds as follows (Sections 4.2.1–4.2.3, pp. 4405–4406):
1. Aim the telescope-mounted electro-optical sensor at the bulb and sample its voltage with an ADC.
2. Record five seconds without sound. The spectrum contains 100 Hz peaks and harmonics attributed to the electrical supply.
3. Operate a 518 Hz air horn 5 cm from the bulb and compare spectra before and during the sound. The authors use an air horn to avoid an electromagnetic effect from the sound source.
4. Play tones specified as 120, 170, 220, …, 1020 Hz, each for two seconds, at 60 and 70 dB. Although the subsection and Figure 9 describe a 100–2000 Hz range, these are the tone frequencies stated in the experimental setup.
5. Compare signal-to-noise ratio (SNR) across frequencies and volumes. The authors report decreasing response with increasing frequency and improved SNR at higher volume.

Inference: a finite sampled stream could be represented as a Verus `Seq`, with contracts for sample count and bounds. A specification relating an acoustic tone to an optical frequency peak would model the experiment's physical premise; verifying software against it would not establish that premise experimentally.

## technique 2: optical-acoustical transformation (OAT)
Section 5 describes four stages: filtering, normalization, noise reduction, and equalization (pp. 4406–4407). Algorithm 1 takes “INPUT: optical-stream, fs, equalizer-function” and sets “bulbFs = 100” (Appendix, p. 4415).

Steps from Algorithm 1, with the additional filter specified in Section 5:
1. Read `fs` samples into `opt[]` and copy them to `snd*`.
2. Apply band-stop filters at `i = 100, 200, …` while `i < fs/2`. Section 5 also specifies a high-pass filter above 100 Hz; this operation is absent from Algorithm 1.
3. Find the buffer minimum and maximum and scale every sample to `[-1,1]` using `-1 + 2*(sample-min)/(max-min)`.
4. Apply spectral subtraction to reduce noise.
5. Apply the supplied equalizer function to strengthen weak frequencies, then play the recovered buffer. Repeat while the stream is nonempty.

The paper states: “We enhance the speech signal by normalizing the values of opt(t) to the range of [-1,1].” (Section 5, p. 4406) It then specifies spectral subtraction and an equalizer, rather than proceeding directly from filtering to equalization.

Inference: a Verus implementation could prove buffer bounds and preservation of sample count, given contracts for the filters, subtraction, and equalizer. Normalization needs a nonconstant buffer or explicit handling of `max == min`, which the pseudocode does not provide. Claims about removing harmonics or improving intelligibility would require mathematical filter specifications and a signal model; loop invariants alone would not establish them.

## technique 3: single-channel speech quality evaluation
The authors select speech-processing methods that use a single channel, need no training data, support real-time applications, and tolerate changing SNR (Section 5, p. 4407). They describe one reason as “these techniques do not require any prior data collection to create a model” (Section 5, p. 4407). This is a reason for selecting the recovery methods, not a property of evaluation metrics.

Section 6 evaluates intelligibility, log-likelihood ratio (LLR), weighted spectral slope (WSS), and NIST speech SNR (p. 4407). Higher intelligibility and NIST-SNR are better; lower LLR and WSS are better. The authors define NIST-SNR as “the logarithmic ratio between the speech power and the noise power estimated over 20 consecutive ms.” (Section 6, p. 4407)

The evaluation plays reference speech near the bulb, samples the optical signal, applies OAT, and evaluates recovered audio. The visual-microphone comparison uses six TIMIT recordings at 95 dB, speakers 5 cm from a 12 W E14 bulb, and sensing equipment 2.5 m away. The authors also evaluate the six recordings published by the visual-microphone researchers (Section 6.3.1, p. 4409). The hard-drive comparison uses two Harvard-sentence recordings at 85 dB, speakers 25 cm from the bulb, and equipment 2.5 m away. Because the authors could not obtain that study's recovered recordings, they compare NIST-SNR with its published results (Section 6.3.2, p. 4410).

Inference: Verus could verify frame partitioning and arithmetic preconditions in a metric implementation. A proof of the computation would not establish that the score predicts human understanding.

## evidence, countermeasures, and limits
Table 2 reports Lamphone intelligibility of 0.67–0.72 across six recordings. Its average is 0.69 versus 0.68 for the visual microphone, a difference of 0.01. The prose incorrectly says 0.1. Intelligibility standard deviations are 0.02 versus 0.06; average WSS values are 66.39 versus 162.98, a difference of 96.59 (Section 6.3.1, p. 4409). The visual microphone has better average LLR and NIST-SNR. The authors conclude: “The answer to the question of which method is better depends on the metric used to evaluate the methods.” (Section 6.3.3, p. 4410) Table 3 reports average NIST-SNR of 23 for Lamphone versus 9.5 for Hard Drive of Hearing (p. 4409).

For the distance evaluation, the ADC sampling rate is 2 kHz. Sections 6.1–6.3 use an NI-9234; Section 6.4 uses a PXI-4498 module in a PXI-1082 system for its lower noise (Section 6, p. 4407). The long-distance test plays a Donald Trump statement at the virtual-meeting volume level, identified as 75 dB in Section 6.4. Speakers are 25 or 50 cm from the bulb; sensing distances are 15, 25, and 35 m (Section 6.4, pp. 4410–4411). Table 4 reports intelligibility of 0.454 at 35 m with the speakers 25 cm from the bulb, and 0.362 at 35 m with the speakers 50 cm away (p. 4411). The authors describe fair recovery “up to 35 meters when the lamp is located 25 cm from the victim” and “up to 15 meters when the lamp is located 50 cm from the victim.” (Section 6.4, p. 4411)

The tests find different SNRs across lamp and bulb types; lighter LED bulbs outperform heavier ones of equal wattage, and ambient room lighting has little effect in the tested setup (Sections 6.1–6.2, pp. 4408–4409). The fan experiment affects frequencies below 120 Hz; its discussion describes filtering that range, whereas Section 5 specifies a high-pass filter above 100 Hz (Section 6.1.1, p. 4408). Better optics, sensors, and ADC noise performance can improve recovery (Section 7, pp. 4411–4412). These experimental results do not establish success for every lamp or environment.

The authors recommend “installing curtains to eliminate the line of sight or replacing desk lamps with other lighting solutions to eliminate the vulnerability.” (Section 8.4, p. 4413) They also discuss inner rooms without windows and increased separation from eavesdroppers. They rate blocking leakage as highly effective against Lamphone, a safety perimeter as moderately effective, and detection of active attacks as ineffective against this passive method (Section 8 and Table 5, pp. 4412–4413).

## techniques for the catalog
- optical side-channel measurement — sample light-intensity changes from a sound-vibrating bulb with an electro-optical sensor
- frequency characterization — compare baseline and stimulated spectra across bulbs, distances, and acoustic frequencies
- optical-acoustical transformation — filter bulb harmonics, normalize samples, subtract noise, and equalize the stream
- single-channel quality evaluation — score recovered speech with LLR, WSS, NIST-SNR, and intelligibility
- physical countermeasures — block line of sight, remove vibrating objects, or increase distance from the target lamp
