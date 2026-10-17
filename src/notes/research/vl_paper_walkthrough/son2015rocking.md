# Rocking Drones with Intentional Sound Noise on Gyroscopic Sensors
(authored by agents unless marked 🧑)
Tag: `son2015rocking`, [paper](https://www.usenix.org/conference/usenixsecurity15/technical-sessions/presentation/son)

## scope and result

This paper demonstrates that acoustic resonance can inject false outputs into MEMS gyroscopes used by drones. The authors scan 15 gyroscope types, find seven vulnerable gyroscope types, analyze the Multiwii flight-control code, simulate the resulting rotor commands, and attack two drones in flight. The abstract reports: “Our real-world experiments showed that in all 20 trials, one of two target drones equipped with vulnerable gyroscopes lost control and crashed shortly after we started our attack.” (Abstract, p. 881.)

The attack is a physical sensor-input spoofing attack through sound rather than through the normal sensing channel. For drone A, the attack combines sound at its gyroscope’s resonant frequency with a control path that trusts raw gyro values without filtering or validation (Sections 5.2–5.3, p. 890). The paper provides no formal verification of its software. Inference: its algorithms and measurements can inform requirements for sensor-driven Rust controllers.

## technique 1: discover resonant frequencies by exhaustive acoustic scanning

what it is

The authors identify unknown resonances by driving a gyroscope with single-tone sound from 100 Hz to 30 kHz and examining output standard deviation. A sensor is treated as vulnerable when sound causes a large increase over its no-noise output. The paper says: “A simple and reliable way to find the resonant frequency of a MEMS gyroscope is exhaustive search, i.e., scanning with pure single-tone sound over a chosen frequency band.” (Section 4, p. 885.)

when to use it

Inference: use this characterization before deployment to test a sensor package and enclosure across audible and ultrasonic bands.

how to do it

1. Build the sensor’s application circuit and configure registers from its datasheet (Section 4.1, p. 885).
2. Place the sensor 10 cm below a consumer-grade speaker in an anechoic chamber (Section 4.1 and Figure 4, p. 885).
3. Generate single tones from 100 Hz through 30 kHz at 100-Hz intervals; hold each tone until 1,000 sensor samples are collected (Section 4.1, p. 885). The sound source uses a 96-kHz sampling rate to avoid aliasing of the generated sound. Characterize its SPL and total harmonic distortion plus noise; low distortion helps isolate single-frequency effects but is not required for the attack (Section 4.2, pp. 885–886).
4. Hold the sensor frame fixed and compare standard deviations with and without sound; a large increase indicates resonance (Section 4.3, pp. 886–887).
5. Repeat across sensor models, axes, and individual chips to expose manufacturing variation (Section 4.3, pp. 886–888).

Verus form

Inference: treat a sensor driver as a function from sampled raw values to a bounded measurement and specify an interference-detection property over windows. Verus can prove that a runtime monitor rejects values outside calibrated bounds, but it cannot prove a physical resonance bound without a trusted hardware model. Store calibration constants in ghost/spec state and prove that the control loop consumes only values passing validation.

evidence

Seven of 15 gyroscopes resonated. L3G4200D peaks were 7,900–8,300 Hz, L3GD20 19,700–20,400 Hz, LSM330 19,900–20,000 Hz, and four InvenSense parts resonated from 25,800 to 28,600 Hz (Table 1, p. 886). Standard-deviation ratios reached 31.04 for L3GD20 Y, 20.95 for MPU6500 X, and 8.69 for MPU6000 Z (Table 2, p. 886). Twelve chips were tested for L3G4200D, L3GD20, and MPU6000; two chips for each other vulnerable model (Table 1 footnote, p. 886; section 4.3, p. 888).

limits and assumptions

Eight gyroscopes showed no resonance in the scan, but the paper notes that 100-Hz and 50-Hz steps may miss narrow resonances (Section 4.3, p. 888). The speaker also vibrates mechanically, although the authors argue that differing resonances across sensors and absent resonances in some sensors make enclosure vibration an unlikely explanation (Section 4.3, pp. 888–889). They reason: “Because we tested all of the gyroscopes in the same environment, there should have been consistent resonance frequencies for all of the gyroscopes if any enclosure vibration had influenced the motion of the gyroscopes.” (Section 4.3, p. 888.)

## technique 2: model how gyro corruption propagates through PID control

what it is

The authors extract the flight controller’s PID algorithm and show that raw gyroscope values directly affect proportional and derivative terms and then each rotor command. Algorithm 1 computes `P`, `I` from accumulated error, `D` from changes in gyro output, and `PIDCtrl` for each axis. Its simplified rotor loop assigns `rotorCtrl[rotor] = txCtrl[throttle] + PIDCtrl[axis]`, then clamps each rotor command to 1,150–1,850 and actuates the rotors (Section 5.2, pp. 889–890). The authors state: “The details of the software are omitted for simplicity.” (Section 5.2, p. 889.) Inference: the simplified assignments should not be treated as a complete implementation of how axis controls are combined for each rotor.

when to use it

Inference: use this dataflow analysis to identify whether abnormal sensor values are filtered, checked against other sensors, or allowed to saturate actuators.

how to do it

1. Trace raw `gyro[axis]` values into the PID loop (Section 5.2, p. 889).
2. Compute `P = txCtrl[axis] − gyro[axis] × GP[axis]` and `error = txCtrl[axis]/GP[axis] − gyro[axis]` (Algorithm 1, p. 890).
3. Accumulate error and multiply by `GI` for `I`; compute `delta = gyro[axis] − gyrolast[axis]`, sum the last three deltas, and multiply by `GD` for `D` (Algorithm 1, p. 890).
4. Set `PIDCtrl[axis] = P + I − D`; follow the simplified rotor assignment described above (Algorithm 1, p. 890).
5. Clamp rotor commands to MIN=1,150 and MAX=1,850, then actuate (p. 890).
6. Inference: check for validation in this path. The authors report that target drone A trusted its raw gyro output without checking, filtering, or verification (Section 5.2, p. 890).

Verus form

Inference: represent the controller as a pure/spec function over a gyro sample, prior sample, accumulated error, gains, and throttle. State `requires` for finite sensor ranges and gain bounds; state `ensures` that each output is within 1,150–1,850 and that rejected sensor samples cannot influence actuation. Use loop invariants for accumulated error and previous-sample history. Such a property would need a physical model and calibrated limits absent from this paper.

evidence

The paper states: “Throughout the process, the raw data from the gyroscope were not checked, filtered, or verified.” (Section 5.2, p. 890.) In simulation, a 37% scale of the recorded gyro fluctuation was sufficient to drive all rotor outputs to their maximum/minimum range, a maximum change of 700 (Section 5.4, p. 892; Figure 10).

limits and assumptions

Algorithm 1 simplifies Multiwii on drone A. The authors also manually analyzed ArduPilot on drone B and described its PID algorithm as essentially the same, with different gains (Section 5.2, p. 890). Inference: these analyses do not establish behavior for every controller; arithmetic bounds alone do not establish physical correctness of sensor values. Inference: a Verus proof of command clamping alone would leave the attack intact because the controller can repeatedly saturate within numeric bounds while producing unsafe motion.

## technique 3: combine firmware analysis, simulation, and flight experiments

what it is

The paper first analyzes flight-control software, then attacks two drones, then simulates reduced gyro fluctuations to estimate effective attack parameters (Section 5, p. 889). Inference: connecting these measurements helps distinguish sensor disruption from loss of flight control.

when to use it

Inference: use this method to connect a physical disturbance to system behavior; preserve input/output variables so the simulation can be compared with recorded flight data.

how to do it

1. Instrument drone A through two Bluetooth-to-UART modules connected to its flight controller and sonar; record raw gyro, transmitter, rotor-control, and sonar altitude values. Sonar samples have a different rate and a 20-cm minimum sensing distance (Section 5.3, pp. 890–891).
2. Run the attack with a small speaker 10 cm above the gyro; toggle sound off/on/off every 10 seconds while the drone hovers (Section 5.3, p. 890).
3. Compare gyro fluctuations, rotor saturation, throttle, and altitude over the three regions (Figure 9, p. 891).
4. Repeat the attack on drone A; the authors report 20 attacks and a crash in every test (Section 5.3, p. 892).
5. Feed recorded gyro and transmitter traces into a software simulation, scaling gyro output from 1% to 100% in 1% increments (Section 5.4, p. 892).
6. Determine the minimum scale that reaches rotor saturation and compare it with measured acoustic response.

Verus form

Inference: use a verified replay model with ghost traces for sensor, controller, and actuator states. Prove that the executable controller matches the replay specification for every trace in the model. The replay proof cannot establish that the trace distribution or physical coupling is complete; measured flight evidence remains external.

evidence

Drone A used L3G4200D at 8,200 Hz and crashed in all 20 attacks (Table 4, p. 890; Section 5.3, p. 892). Drone B used MPU6000 at 26,200 Hz and was unaffected; the authors attribute this to resonance only along its Z axis, corresponding to horizontal orientation also sensed by its magnetometer (Section 5.3 and Table 4, p. 890). Table 4 lists SPL at resonance as 97 dB for A and 95 dB for B. Separately, the attack setup reports: “The SPL of the fundamental frequency component was 113 dB with the maximum volume of the speaker.” (Section 5.3, p. 890.) Section 5.4 later reports 108.5 dB at approximately 30% amplitude (p. 893). The paper does not reconcile these levels. Figure 9 shows gyro fluctuation, rotor command saturation, and altitude loss for A (p. 891); Section 5.3 reports recovery after sound stopped (p. 892).

limits and assumptions

The experiment uses two DIY drones, with Multiwii on A and ArduPilot on B (Section 5.1 and Table 3, p. 889). Crashes damage hardware and require recalibration, limiting repeated testing (Section 5.3, p. 892). Inference: these trials do not establish a crash probability for other drones.

## technique 4: estimate attack distance from amplitude and SPL

what it is

The authors combine simulation, indoor amplitude measurements, a sound-pressure scaling law, and the measured crash threshold to estimate practical attack distance. They experimentally observe that approximately 30% of maximum sound amplitude was enough at the test location, with measured SPL 108.5 dB (Section 5.4, p. 893).

when to use it

Inference: use this analysis to estimate attack range, stating the sound source, reference distance, SPL assumptions, and difference between an estimated range and a demonstrated flight attack.

how to do it

1. Scale recorded gyro output in simulation and find the minimum scale that saturates rotor controls (Section 5.4, p. 892).
2. Measure gyro standard deviation versus sound amplitude on a desk at 10 cm, averaging ten identical experiments with 1,000 samples each. Compare the measurements with theoretical relative SPL; the paper does not report fitting a curve (Figure 11, p. 892; Section 5.4, p. 893).
3. Map the simulation’s 37% gyro-output scale to approximately 27% sound amplitude using Figure 11. Then check experimentally: the authors observed approximately 30% amplitude as the lower bound for crashing drone A in the same environment, with measured SPL 108.5 dB (Section 5.4, p. 893).
4. Compare relative sound amplitude with relative SPL using `SPL = SPLref + 20 log10(A/Aref)` (Equation 1, p. 893). The crash-threshold SPL itself was measured.
5. Estimate SPL versus distance with `SPL = SPLref − 20 log10(d/dref)` (Equation 2, p. 893).
6. Report the estimated 16.78-cm range for the attack speaker whose maximum SPL was 113 dB at the 10-cm reference distance, and the estimated 37.58-m range for a source rated at 140 dB at 1 m. Both estimates use the 108.5-dB crash threshold (Section 5.4, p. 893).

Verus form

Inference: encode the equations as spec functions and prove unit/range properties, but keep SPL measurements and speaker transfer functions as assumptions. A verified Rust threat estimator can prevent arithmetic mistakes; it cannot validate the acoustic model or ensure a field speaker meets its rated SPL.

evidence

The attack speaker’s estimated range was 16.78 cm using its maximum 113-dB output at the 10-cm reference distance. A 140 dB source at 1 m would yield an estimated 37.58 m attack distance (Section 5.4, p. 893). The 30% amplitude threshold comes from the authors’ experiments in the same environment. Inference: it cannot be assumed for other drones or acoustic setups.

limits and assumptions

Consumer speakers are nonlinear; the paper notes that measured standard-deviation decrease was smaller than theoretical SPL decrease above 70% amplitude because of harmonic/subharmonic leakage (p. 893). Inference: the estimated range depends on acoustic propagation, source performance at the resonant frequency, enclosure, and drone orientation; the paper does not demonstrate the projected remote attack.

## technique 5: countermeasure options and their verification implications

what it is

The paper evaluates physical isolation and discusses differential comparison and resonance tuning. Physical isolation puts material between source and sensor; differential comparison uses an additional structure/sensor to cancel resonant output; tuning changes resonance frequency and magnitude.

when to use it

Inference: consider isolation, a dedicated resonance reference, or tuning when choosing hardware defenses. Software plausibility checks are an additional proposal, not a defense implemented or validated by this paper.

how to do it

1. Insert paper, acrylic, aluminum, or foam between speaker and L3G4200D (Section 6.2, p. 894).
2. Measure the remaining resonant output over ten experiments and 1,000 samples per experiment (Figure 12 caption, p. 894).
3. For the discussed differential comparator, use an additional gyroscope with a special structure responding only to the resonant frequency to cancel the main gyro’s resonant output; this is prior work, not a countermeasure implemented in these drone experiments (Section 6.2, p. 894).
4. For resonance tuning, alter sensing-electrode capacitance with a feedback capacitor (p. 894).
5. Inference: assess effects on other sensors and board temperature. The paper warns that surrounding the gyro with materials could cause such problems; it also notes extra comparator cost and that tuning leaves an exploitable resonant frequency (Section 6.2, p. 894).

Verus form

Inference: model a validated sensor pair and isolation state as a proof-oriented API. Use invariants that require agreement within tolerance before actuation and transition to a safe mode on disagreement. Verus can verify fail-safe control logic; it cannot prove that foam gives a specified dB insertion loss or that the second sensor is independent.

evidence

The authors report: “Using these materials, the effect of the sound noise on one L3G4200D gyroscope was decreased to 23.78%, 16.25%, and 60.49% for the three axes.” (Section 6.2, p. 894.) Inference: these are remaining effects rather than percentage reductions; the prose does not provide a separate value for each material. The paper reports that one-inch foam has approximately 120 dB insertion loss based on prior work, but warns that enclosure materials can affect other components and temperature (p. 894).

limits and assumptions

Inference: isolation results need confirmation for the intended geometry and frequency. Differential comparison adds hardware cost. Resonance tuning leaves a resonance, so an attacker can target the new frequency (Section 6.2, p. 894). The authors call for a low-cost software defense but do not provide one (Section 7, p. 895).

## what is proved, measured, and trusted

observed: the paper provides no formal program-correctness proof. It reports an experimentally observed attack path from acoustic resonance to raw gyro output, PID saturation, and loss of control for one target drone

measured: 15 sensor types, seven vulnerable models, standard-deviation ratios, two target drones, 20 attacks on Drone A, simulation scales, SPL values, and isolation results with denominators stated above

trusted: Arduino/register drivers, Multiwii source interpretation, sensor and speaker measurements, flight instrumentation, simulator fidelity, and simulator inputs drawn from the recorded attack; Inference: applying these results to deployed drones requires evidence that their hardware and control paths behave similarly

Inference: verified Rust control code remains exposed to this attack if it trusts sensor values without assumptions linking them to physical motion. Verus can prove bounded arithmetic, clamping, state transitions, and fail-safe behavior, but a proof that accepts every raw gyro value does not establish safe actuation. A possible verification goal is to check sensor plausibility and fallback behavior, then test the physical inputs assumed by the software model.

## techniques for the catalog

- resonance discovery — scan single-tone frequencies and compare output standard deviations across sensors and axes
- sensor-to-actuator dataflow — trace raw sensor values through PID terms, saturation, and actuator commands
- layered physical validation — connect firmware analysis, simulation, instrumentation, and repeated flight experiments
- acoustic threat-range estimation — combine measured amplitude thresholds with SPL-distance equations
- defense comparison — evaluate isolation and reason about differential sensing and resonance tuning with explicit hardware limits

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The standard deviations changed by factors up to dozens, with the greatest change being by a factor of 31.04 (for the Y-axis of L3GD20)."): checked the full text, quotations, numbers, sections, printed pages, and technique steps; corrected the vibration argument, simplified PID description, flight-test wording, distance-analysis steps, SPL interpretation, and unsupported recommendations; did not reproduce experiments, inspect source code, validate Verus proposals, or independently check cited work and speaker ratings. The publisher link appears on the paper’s cover.
