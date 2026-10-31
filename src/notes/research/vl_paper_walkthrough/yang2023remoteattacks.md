# Remote Attacks on Speech Recognition Systems Using Sound from Power Supply
(authored by agents unless marked 🧑)
Tag: `yang2023remoteattacks`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/yang-lanqing)

## scope
SING ATTACK modulates an attack computer's CPU load so current transmitted through the power grid causes a nearby switching-mode power supply (SMPS) to emit sounds that a victim's speech-recognition (SR) system interprets as commands. The abstract reports: “In experiments on ten SR systems, SING ATTACK achieved Mel-Cepstral Distortion of 7.8 from an attack initiated at a distance of 23m.” (Abstract, p. 4571). Inference: this experimental attack paper is useful for identifying environmental assumptions that software verification alone cannot establish.

## technique 1: four-stage attack pipeline
what it is and when to use it
The pipeline turns owner voice samples into commands transmitted through the power grid and emitted acoustically near the victim. The threat model requires a shared distribution box and a working SMPS near the victim (Section 4, p. 4576).

how to do it
1. Reference sound generation: collect the owner's ordinary voice with a phone and denoise it using variational mode decomposition. Extract and splice phonemes into activation commands, test them on a mockup victim, and retain successful samples as reference sounds. Generate control commands using text-to-speech; the paper says these commands do not require voice authentication (Sections 5.2.1–5.2.2, pp. 4576–4577).
2. CPU modulation and current generation: vary frequency and amplitude through CPU switching, duty cycle, instructions, and power consumption; inject current into the grid and record the mockup victim's sound. Section 5.1 specifies a mockup of the same device kind; Section 6.1 instead reports using a Xiaomi 10 to train universal models for the evaluated victims (pp. 4576, 4580).
3. Reinforcement learning and sound generation: use reference and modulated sound to train the model, with Mel-Cepstral Distortion (MCD) as the similarity measure and reported reward. Stop according to the loss or MCD rule described below (Sections 5.1 and 5.4.2, pp. 4576, 4580).
4. Attack the victim: use the tuned model to generate current-induced sounds; the SR system extracts and executes commands (Section 5.1, p. 4576).
The paper claims: “MCD (Mel-Cepstral Distortion) measures the degree of similarity between the reference and synthesized voices, and an MCD value below 8 indicates fidelity sufficient to ensure a successful attack.” (Section 5.1, p. 4576). Inference: this threshold is the authors' criterion, not a proof of success for every SR system.

Verus form
Inference: represent the four stages with a Verus `enum` and require reference samples, a shared power grid, a compatible mockup, and an inactive victim before generating an attack command. A verified transition function could enforce stage order and require a supplied MCD measurement below a chosen bound. It would still assume that the measurement and physical model describe the real devices.

evidence and limits
The four threat-model assumptions are a multicore desktop on the victim's power grid, knowledge of the victim model and no victim use during attack, access to owner voice samples, and a working SMPS within 30 cm when the victim is not charging. Root access to the attacker is not required (Section 4, p. 4576). The evaluation used ten SR systems: four phones and six smart speakers, ten commands, and distances up to 23 m. The base attacker was a Dell OptiPlex7080MT with an eight-core i7-10700 and a 500 W SMPS; some experiments used multiple desktops (Section 6.1, pp. 4580–4581; Table 2, p. 4582). At 9 m, the paper reports: “Superimposing multiple desktops resulted in 100% success against all ten SR systems.” (Section 6.4.1, p. 4581). The separate 23 m distance experiment used a Samsung S7; four desktops achieved 100% accuracy with MCD below 8 (Section 6.4.3, p. 4582).

## technique 2: CPU modulation algorithms
what it is and when to use it
Algorithm 1 controls one attack machine's workers; Algorithm 2 assigns current frequencies and intensities across multiple machines so signals superimpose.

how to do it
1. The Transmitter receives target frequencies and intensities, adjusts power consumption, binds threads to CPU cores, and creates Workers. For each target pair it calculates duty cycle and a load instruction, sets the switching period to the reciprocal of frequency, and runs for the specified transmission interval (Algorithm 1, p. 4578).
2. The Transmitter sets a shared flag and uses two barriers to coordinate full-load and idle portions of each period. Each Worker executes the selected instruction while the flag is set, then waits at the second barrier (Algorithm 1, p. 4578).
3. For multiple desktops, synchronize clocks, sort targets by intensity, divide them into groups, and distribute groups among machines. Each machine then uses Algorithm 1 (Algorithm 2 and Section 5.3.3, p. 4579).
The paper states: “Note that we can use Network Time Protocol (NTP) to ensure synchronization among multiple desktops.” (Section 5.3.3, p. 4579).

Verus form
Inference: model frequency, duty cycle, worker count, and duration as bounded integers or rationals; use `requires` for Table 1 ranges and prove that each worker receives a consistent assignment. Barrier correctness would require a concurrency model beyond these parameter bounds. The operating-system scheduler, timing precision, and electrical response remain assumptions.

evidence and limits
Table 1 gives duty cycle 0–1, switching frequency 1–15 kHz, device number 1–n, CPU core count 0–m, time interval 1–100 ms, GPU utilization 0–1, and load-program choices (p. 4579). Section 5.3.4 also proposes parallel resistance, series resistance, and a UPS to strengthen the current signal (p. 4579). Unless stated otherwise, Section 6 experiments used signal-strength enhancement. Without enhancement, a single desktop at 14–23 m attacked five of ten systems, averaging 74% accuracy across those five (Section 6.4.1, p. 4581).

## technique 3: reinforcement-learning parameter search with MCD
what it is and when to use it
The authors describe CPU-modulation parameter selection using deep Q-learning: the state is a preprocessed signal matrix, the action contains seven parameters, and MCD supplies the reported reward (Section 5.4.2, p. 4580).

how to do it
1. Define action vector `a=[a1,…,a7]` over discrete parameter ranges and state `S∈R^{N×T}` from preprocessed audio (Section 5.4.2, p. 4580).
2. Use a Q-network `Net(S)={Q(S,a)}` over all action combinations.
3. Generate sounds for a sampled parameter sequence, calculate MCD to reference sound, and use it as reward.
4. Use the gradient update and sampled estimator in Equations 3–4, with a moving-average baseline to reduce variance (Section 5.4.2, p. 4580).
5. Apply the paper's stopping rule: “The algorithm is terminated when N loss is not updated or R reaches the defined MCD threshold, which was set to 8.” (Section 5.4.2, p. 4580).
Inference: the description leaves implementation details unresolved. It calls the approach deep Q-learning but gives a log-probability gradient estimator, maximizes a reward identified as MCD although lower MCD is better, and does not specify the loss-history length in the stopping sentence. A faithful implementation would need these points clarified.

Verus form
Inference: a verified Rust wrapper could enforce parameter bounds and an explicit iteration limit. A finite action table alone does not guarantee termination. Treat the learned model and measured training results as supplied inputs; verifying the wrapper would not establish optimal acoustic similarity.

evidence and limits
Section 6.2 defines accuracy as total successful attacks divided by total tests across ten commands, then states: “Note that all commands were repeated five times, and max accuracy is reported as the attacking accuracy.” (p. 4580). Inference: the maximum-selection procedure is insufficiently described; it should not be silently interpreted as pooled average accuracy. At 7 m, after thirty rounds with ten commands against six smart speakers, accuracy against a single victim reached 78% (Section 6.5.6, p. 4584). A separate surge-protector and regulator experiment reports 95% accuracy in most scenarios (Section 6.5.7, p. 4584). These setups and reporting rules differ.

## techniques for the catalog
- staged side-channel pipeline — collect reference audio, modulate CPU current, learn a matching signal, and deliver it through the victim SMPS
- synchronized CPU modulation — coordinate barrier-synchronized workers and multi-device current assignments
- MCD-guided parameter learning — search modulation parameters using measured similarity, with the paper's stated loss or MCD stopping rule
- denominator-aware attack evaluation — report command, victim, distance, repetition, and device denominators separately
