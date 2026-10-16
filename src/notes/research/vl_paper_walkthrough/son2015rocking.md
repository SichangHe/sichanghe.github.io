# Rocking Drones with Intentional Sound Noise on Gyroscopic Sensors
(authored by agents unless marked 🧑)
Tag: `son2015rocking`, [paper](https://www.usenix.org/conference/usenixsecurity15/technical-sessions/presentation/son)

## scope and result

This paper demonstrates that acoustic resonance can inject false outputs into MEMS gyroscopes used by drones. The authors scan 15 gyroscope types, find seven vulnerable resonances, analyze the MultiWii flight-control code, simulate the resulting rotor commands, and attack two drones in flight. The abstract reports: “Our real-world experiments showed that in all 20 trials, one of two target drones equipped with vulnerable gyroscopes lost control and crashed shortly after we started our attack.” (Abstract, p. 881.)

The attack is a physical sensor-input spoofing attack through sound rather than through the normal sensing channel. It relies on a target gyroscope’s resonant frequency, high sound pressure, and flight software that trusts raw gyro values without filtering or validation. This is a systems-security study, not a formal verification paper; its algorithms and measurements can nevertheless become verification requirements for sensor-driven Rust controllers.

## technique 1: discover resonant frequencies by exhaustive acoustic scanning

what it is

The authors identify unknown resonances by driving a gyroscope with single-tone sound from 100 Hz to 30 kHz and examining output standard deviation. A sensor is treated as vulnerable when sound causes a large increase over its no-noise output. The paper says: “A simple and reliable way to find the resonant frequency of a MEMS gyroscope is exhaustive search, i.e., scanning with pure single-tone sound over a chosen frequency band.” (Section 4, p. 885.)

when to use it

Use this characterization to test whether a sensor package and enclosure reject acoustic interference across audible and ultrasonic bands. It is a pre-deployment measurement, not a runtime defense.

how to do it

1. Build the sensor’s application circuit and configure registers from its datasheet (Section 4.1, p. 885).
2. Place the sensor 10 cm below a consumer-grade speaker in an anechoic chamber (Figure 4, p. 885).
3. Generate single tones from 100 Hz through 30 kHz at 100-Hz intervals; sample each target until 1,000 output samples are collected (Section 4.1, p. 885).
4. Hold the sensor frame fixed and compare standard deviations with and without sound; a large increase indicates resonance (Section 4.3, p. 886).
5. Repeat across sensor models, axes, and individual chips to expose manufacturing variation (Section 4.3, pp. 886–888).

Verus form

Inference: treat a sensor driver as a function from sampled raw values to a bounded measurement and specify an interference-detection property over windows. Verus can prove that a runtime monitor rejects values outside calibrated bounds, but it cannot prove a physical resonance bound without a trusted hardware model. Store calibration constants in ghost/spec state and prove that the control loop consumes only values passing validation.

evidence

Seven of 15 gyroscopes resonated. L3G4200D peaks were 7,900–8,300 Hz, L3GD20 19,700–20,400 Hz, LSM330 19,900–20,000 Hz, and four InvenSense parts resonated from 25,800 to 28,600 Hz (Table 1, p. 886). Standard-deviation ratios reached 31.04 for L3GD20 Y, 20.95 for MPU6500 X, and 8.69 for MPU6000 Z (Table 2, p. 886). Twelve chips were tested for L3G4200D, L3GD20, and MPU6000; two chips for each other vulnerable model (Table 1 footnote, p. 886; section 4.3, p. 888).

limits and assumptions

Eight gyroscopes showed no resonance in the scan, but the paper notes that 100-Hz and 50-Hz steps may miss narrow resonances (Section 4.3, p. 888). The speaker also vibrates mechanically, although the authors argue that consistent peaks across sensors and absent peaks in some sensors make enclosure vibration an unlikely explanation (p. 888).

## technique 2: model how gyro corruption propagates through PID control

what it is

The authors extract the flight controller’s PID algorithm and show that raw gyroscope values directly affect proportional and derivative terms and then each rotor command. Algorithm 1 computes, for each axis, `P`, an accumulated error `I`, a change term `D`, and `PIDCtrl`; it then adds the control value to every rotor, clamps each command to 1,150–1,850, and actuates the rotors (Section 5.2, pp. 889–890).

when to use it

Use this dataflow analysis when a sensor is safety-critical. It identifies whether abnormal values are filtered, range-checked, cross-validated, or allowed to saturate actuators.

how to do it

1. Trace raw `gyro[axis]` values into the PID loop (Section 5.2, p. 889).
2. Compute `P = txCtrl[axis] − gyro[axis] × GP[axis]` and `error = txCtrl[axis]/GP[axis] − gyro[axis]` (Algorithm 1, p. 890).
3. Accumulate error for `I`; compute `delta = gyro − gyrolast`, sum recent deltas, and derive `D` (Algorithm 1, p. 890).
4. Set `PIDCtrl = P + I − D` and add it to throttle for each rotor (p. 890).
5. Clamp rotor commands to MIN=1,150 and MAX=1,850, then actuate (p. 890).
6. Check whether any raw-data filter, plausibility check, or sensor cross-check interrupts this path; the paper found none (p. 890).

Verus form

Inference: represent the controller as a pure/spec function over a gyro sample, prior sample, accumulated error, gains, and throttle. State `requires` for finite sensor ranges and gain bounds; state `ensures` that each output is within 1,150–1,850 and that rejected sensor samples cannot influence actuation. Use loop invariants for accumulated error and previous-sample history. The paper’s vulnerable implementation would fail a stronger invariant that links gyro changes to physically plausible attitude changes.

evidence

The paper states: “Throughout the process, the raw data from the gyroscope were not checked, filtered, or verified.” (Section 5.2, p. 890.) In simulation, a 37% scale of the recorded gyro fluctuation was sufficient to drive all rotor outputs to their maximum/minimum range, a maximum change of 700 (Section 5.4, p. 892; Figure 10).

limits and assumptions

The algorithm is one target’s firmware and may not generalize to other controllers. Proving arithmetic bounds does not prove physical correctness of sensor values. Inference: a Verus proof of command clamping alone would leave the attack intact because the controller can repeatedly saturate at safe numeric bounds while producing unsafe motion.

## technique 3: combine firmware analysis, simulation, and flight experiments

what it is

The paper uses three linked forms of evidence: source/firmware analysis explains propagation, software simulation estimates the fluctuation needed for saturation, and real-world flights test whether the drone crashes. The combination avoids treating a sensor waveform alone as proof of system impact.

when to use it

Use this layered method when a physical fault must be connected to a safety outcome. Each layer should preserve the same input/output variables so the simulation can be checked against the flight trace.

how to do it

1. Instrument the flight controller through Bluetooth-to-UART and record raw gyro, transmitter, rotor-control, and sonar altitude values (Section 5.3, pp. 890–891).
2. Run the attack with a small speaker 10 cm above the gyro; toggle sound off/on/off every 10 seconds while the drone hovers (Section 5.3, p. 890).
3. Compare gyro fluctuations, rotor saturation, throttle, and altitude over the three regions (Figure 9, p. 891).
4. Repeat 20 flights and record whether control is lost (Section 5.3, p. 892).
5. Feed recorded gyro and transmitter traces into a software simulation, scaling gyro output from 1% to 100% in 1% increments (Section 5.4, p. 892).
6. Determine the minimum scale that reaches rotor saturation and compare it with measured acoustic response.

Verus form

Inference: use a verified replay model with ghost traces for sensor, controller, and actuator states. Prove that the executable controller matches the replay specification for every trace in the model. The replay proof cannot establish that the trace distribution or physical coupling is complete; measured flight evidence remains external.

evidence

Drone A used L3G4200D at 8,200 Hz and crashed in all 20 attacks; Drone B used MPU6000 at 26,200 Hz and was unaffected because only its Z axis resonated and the magnetometer sensed the corresponding horizontal orientation (Table 4, p. 890). The attack speaker produced 113 dB at maximum; Drone A was attacked at 97 dB and Drone B at 95 dB (Table 4, p. 890). Figure 9 shows gyro fluctuation, rotor command saturation, and immediate altitude loss for Drone A (p. 891).

limits and assumptions

The sample is two drones and one attack geometry. Crashes damage hardware and require recalibration, limiting repeated testing (Section 5.3, p. 892). The experiment does not establish a population-wide crash probability.

## technique 4: estimate attack distance from amplitude and SPL

what it is

The authors combine simulation, indoor amplitude measurements, a sound-pressure scaling law, and the measured crash threshold to estimate practical attack distance. They derive that approximately 30% of maximum sound amplitude was enough at the test location, corresponding to 108.5 dB.

when to use it

Use this analysis to convert a lab attack into an engineering threat range. Treat the result as a model-based estimate and report the sound source, reference distance, and SPL assumptions.

how to do it

1. Scale recorded gyro output in simulation and find the minimum scale that saturates rotor controls (Section 5.4, p. 892).
2. Measure gyro standard deviation versus sound amplitude on a desk; fit the observed logarithmic trend (Figure 11, p. 892).
3. Identify the sound amplitude that reaches the simulation’s effective fluctuation; the paper observed about 30% for Drone A (p. 893).
4. Convert amplitude to SPL with `SPL = SPLref + 20 log(A/Aref)` (Equation 1, p. 893).
5. Convert SPL to distance with `SPL = SPLref − 20 log(d/dref)` (Equation 2, p. 893).
6. Report both the same-speaker range (16.78 cm at 113 dB) and stronger directional-source estimates (37.58 m for a 140-dB-at-1-m source) (p. 893).

Verus form

Inference: encode the equations as spec functions and prove unit/range properties, but keep SPL measurements and speaker transfer functions as assumptions. A verified Rust threat estimator can prevent arithmetic mistakes; it cannot validate the acoustic model or ensure a field speaker meets its rated SPL.

evidence

The same consumer speaker’s estimated range was 16.78 cm at maximum 113 dB. A 140 dB source at 1 m would yield an estimated 37.58 m attack distance (Section 5.4, p. 893). The 30% amplitude threshold comes from the authors’ experiments in the same environment and is not a universal threshold.

limits and assumptions

Consumer speakers are nonlinear; the paper notes that measured standard-deviation decrease was smaller than theoretical SPL decrease above 70% amplitude because of harmonic/subharmonic leakage (p. 893). Directionality, enclosure, frequency response, and drone orientation can invalidate the distance estimate.

## technique 5: countermeasure options and their verification implications

what it is

The paper evaluates physical isolation and discusses differential comparison and resonance tuning. Physical isolation puts material between source and sensor; differential comparison uses an additional structure/sensor to cancel resonant output; tuning changes resonance frequency and magnitude.

when to use it

Use isolation for low-cost passive protection, cross-sensor comparison when hardware budget permits, and resonance tuning at design time. Combine hardware mitigation with software range/plausibility checks because each has failure modes.

how to do it

1. Insert paper, acrylic, aluminum, or foam between speaker and L3G4200D (Section 6.2, p. 894).
2. Measure the remaining resonant output over ten experiments and 1,000 samples per experiment (Figure 12 caption, p. 894).
3. For differential comparison, add a structure that responds only at the resonant frequency and cancel the main sensor’s resonant output (p. 894).
4. For resonance tuning, alter sensing-electrode capacitance with a feedback capacitor (p. 894).
5. Check that isolation, added structures, or tuning do not interfere with other sensors, temperature, or drone control (p. 894).

Verus form

Inference: model a validated sensor pair and isolation state as a proof-oriented API. Use invariants that require agreement within tolerance before actuation and transition to a safe mode on disagreement. Verus can verify fail-safe control logic; it cannot prove that foam gives a specified dB insertion loss or that the second sensor is independent.

evidence

The three axes’ residual effect after the tested materials was reduced to 23.78%, 16.25%, and 60.49% of the unisolated effect (Section 6.2, p. 894). The paper reports that one-inch foam has approximately 120 dB insertion loss based on prior work, but warns that enclosure materials can affect other components and temperature (p. 894).

limits and assumptions

Isolation performance varies with geometry and frequency. Differential comparison adds hardware cost. Resonance tuning leaves a resonance, so an attacker can target the new frequency (p. 894). The authors call for a low-cost software defense but do not provide one (Section 7, p. 895).

## what is proved, measured, and trusted

observed: the paper provides no formal program-correctness proof. It reports an experimentally observed attack path from acoustic resonance to raw gyro output, PID saturation, and loss of control for one target drone

measured: 15 sensor types, seven vulnerable models, standard-deviation ratios, two target drones, 20 Drone A flights, simulation scales, SPL values, and isolation results with denominators stated above

trusted: Arduino/register drivers, MultiWii source interpretation, sensor and speaker measurements, flight instrumentation, simulator fidelity, and the assumption that tested components represent deployed drones

Inference: threat to agent-written verified Rust is substantial where control code trusts sensor values without a physically grounded validity contract. Verus can prove bounded arithmetic, clamping, state transitions, and fail-safe behavior, but a proof that accepts every raw gyro value does not establish safe actuation. The paper’s highest-value lesson is to verify sensor plausibility and independent fallback paths, then test the hardware channel that the software model omits.

## techniques for the catalog

- resonance discovery — scan single-tone frequencies and compare output standard deviations across sensors and axes
- sensor-to-actuator dataflow — trace raw sensor values through PID terms, saturation, and actuator commands
- layered physical validation — connect firmware analysis, simulation, instrumentation, and repeated flight experiments
- acoustic threat-range estimation — combine measured amplitude thresholds with SPL-distance equations
- defense comparison — evaluate isolation and reason about differential sensing and resonance tuning with explicit hardware limits

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Our attacks successfully disrupted control of target drone A, but it did not affect target drone B."): checked the entire supplied paper text, quotations, technique steps, numbers, section and proceedings-page references, tag, and publisher link; corrected the link, page references, sample-count source and formal-proof wording; did not independently reproduce the acoustic experiments, simulations, or flight tests, and marked Verus adaptations as Inference.
