# Sound-Proof: Usable Two-Factor Authentication Based on Ambient Sound
(authored by agents unless marked 🧑)
Tag: `karapanos2015soundproof`, [paper](https://www.usenix.org/conference/usenixsecurity15/technical-sessions/presentation/karapanos)

## scope and result

Sound-Proof is a two-factor authentication protocol in which a phone and browser record ambient sound and the phone decides whether the devices are co-located. In a sufficiently noisy environment, the user enters only username and password; the phone receives the browser’s encrypted recording, computes a similarity score locally, and reports a Boolean result to the server. The paper’s abstract states: “Sound-Proof does not require interaction between the user and his phone.” (Abstract, p. 483.) The prototype supports Android, iOS, and WebRTC-capable browsers. Quiet environments require the user to make noise (Section 5.2, p. 488).

The protocol is designed against a remote adversary who knows the username and password but cannot compromise the phone or victim computer. It excludes compromised endpoints, co-located attackers, man-in-the-middle adversaries, and active phishing (Section 2, p. 484). The authors state: “We do not address targeted attacks where the adversary is co-located with the victim.” Inference: the security claim applies only within these exclusions.

## technique 1: one-third-octave filtering plus normalized cross-correlation

what it is

The similarity score combines time and frequency information. Each sample is filtered into one-third-octave bands; each corresponding pair is compared with maximum normalized cross-correlation over a bounded lag; the score is the average of those maxima. The paper says: “In order to consider both time domain and frequency domain information of the recordings, we use one-third octave band filtering and cross-correlation.” (Section 4, p. 486.)

For two n-point signals, cross-correlation is `c_x,y(l) = sum_{i=0}^{n-1} x(i) y(i-l)`, with `y(i) = 0` outside its index range. Normalization divides by the square root of the product of the two zero-lag auto-correlations, mapping the value to [-1,1]. The maximum absolute normalized cross-correlation over lag is used when alignment is uncertain (Section 4, p. 486).

when to use it

Inference: use this construction when two recordings contain the same short-lived ambient events but differ in microphone gain, attenuation, and small clock offsets. It is a proximity discriminator, not an audio identity proof.

how to do it

1. Record synchronized browser and phone samples for `t` seconds (Section 5.2, p. 487).
2. Filter each signal into the selected one-third-octave bands (Section 5.1, p. 487).
3. For each band pair, calculate normalized cross-correlation for lags from zero to `l_max` (Sections 4 and 5.1, pp. 486–487).
4. Take the maximum absolute normalized cross-correlation for each band and average them to obtain `S_x,y` (Section 5.1, p. 487).
5. Require both samples’ average power to exceed `τ_dB` and `S_x,y` to exceed `τ_C`; otherwise reject (Section 5.2, p. 488).

Verus form

Inference: model samples as finite `Seq<i32>` or `Seq<f64>` only if the arithmetic theory and trusted numeric library are explicit. Define pure specifications for band extraction, correlation, and threshold decisions; prove bounds and determinism with `spec fn` and `proof fn`. Executable FFT/filter code needs contracts connecting its output to the mathematical model. Floating-point rounding, microphone drivers, and WebRTC processing remain trusted unless modeled.

evidence

The authors collected 2,007 login attempts (4,014 audio samples) across environments, activities, phone positions, two phone models, and two computer models (Section 7, p. 489). They discarded five attempts with either sample below 40 dB before the remaining evaluation (Section 7.1, p. 489). With bands [50 Hz–4 kHz], the equal error rate was 0.0020 at `τ_C = 0.13` (Figure 3, p. 490). Section 7.1 states: “We used the collected samples to find the configuration of system parameters”. Inference: the selected thresholds and error rate are empirical results, not a formal guarantee.

limits and assumptions

The paper warns that browser audio preprocessing differs. Firefox produced an equal error rate of 0.012 in their test, while Opera behaved like Chrome (Section 9, p. 494). Cross-correlation can be fooled by synchronized media sources; it cannot resist a co-located attacker who records the same ambient sound.

## technique 2: encrypted browser sample and phone-local decision

what it is

The browser encrypts its audio sample under the phone’s public key. The phone decrypts it, compares it with its local recording, and sends only the decision to the server. The paper states: “For privacy reasons, we do not upload cleartext audio samples to the server.” (Section 5, p. 487.) Communication is proxied through the server, avoiding browser plug-ins or short-range APIs.

when to use it

Inference: use this architecture when the verifier should not receive raw sensor data and a mobile token can perform the comparison. It still requires a trusted phone application, a server, and a public-key enrollment step.

how to do it

1. Enroll the phone application and bind its unique public key to the user account (Section 5.2, p. 487).
2. At login, send the phone public key to the browser after password verification (p. 487).
3. Record on both devices while synchronizing timestamps with the server (p. 487).
4. Encrypt the browser sample using AES-256 with a fresh symmetric key and encrypt that key with RSA-2048 under the phone key (Section 6, p. 488).
5. Proxy the ciphertext to the phone; decrypt and compare locally; inform the server whether the login is legitimate (Sections 5–5.2, pp. 487–488).

Verus form

Inference: represent the enrollment binding and protocol state as a Verus state machine. Use transition invariants to require that a decision corresponds to the enrolled key and current login attempt; use `requires`/`ensures` for authenticated message handling. Cryptographic primitives and browser transport should have verified contracts or explicit assumptions. Verus can prove state-machine safety but does not prove the phone OS, WebRTC, or RSA/AES implementations.

evidence

The prototype uses CherryPy/MySQL, WebSocket, HTML/JavaScript, AES-256, RSA-2048, and WebRTC; it requires no browser modification or plugin (Section 6, p. 488). Average verification time was 4,677 ms ±181 ms over WiFi and 4,944 ms ±233 ms over cellular for 1,000 attempts per connection type (Section 6 and Table 1, p. 489).

limits and assumptions

The authors warn: “A malicious server can also access the computer’s microphone while the user is visiting the server’s webpage.” (Section 9, p. 494.) Browser permission and recording alerts are discussed on p. 495. The phone recording is never uploaded; the browser recording reaches the server encrypted under the phone’s key (Section 5, pp. 487–488). Inference: this protects recordings in the prescribed protocol but cannot stop a malicious webpage from separately recording browser audio after permission.

## technique 3: synchronization and threshold calibration

what it is

The devices synchronize clocks with the server during recording, then adjust sample timestamps. The lag bound `l_max` is set to the largest observed synchronization error. The authors use a power threshold to reject silence and a correlation threshold selected from false-rejection and false-acceptance curves.

when to use it

Inference: use synchronization whenever sensor samples must be compared across devices. Calibrate thresholds against the intended environment and threat model; a threshold selected on one browser or microphone pair may not transfer.

how to do it

1. Run a simple HTTP time-synchronization protocol while recording (Section 6, p. 489).
2. Adjust each timestamp by its measured offset after recording (p. 489).
3. Set `τ_dB = 40 dB`; for the subsequent evaluation, discard the five of 2,007 attempts with either sample below that threshold (Section 7.1, p. 489).
4. Set `l_max = 150 ms`, the largest measured clock difference (p. 489).
5. Search one-third-octave ranges with lower centers from 50–100 Hz and upper centers from 630 Hz–8 kHz; choose bands and `τ_C` using false rejection rate (FRR), false acceptance rate (FAR), and their crossing point, the equal error rate (Section 7.1, pp. 489–490).
6. Use [50 Hz–4 kHz] and `τ_C = 0.13` for the reported equal-error operating point (Figure 3, p. 490).

Verus form

Inference: encode the protocol’s time and threshold parameters as immutable configuration with proof obligations that `0 <= l <= l_max` and rejection follows when power or score is below threshold. A calibrated value is an assumption backed by measurements, not a theorem. Use ghost state to record the calibration dataset identifier and environment if reproducibility matters.

evidence

Clock difference averaged 42.47 ms ±30.35 ms in the prototype (Section 6, p. 489). The equal-error rate was 0.0020 at the selected threshold (Figure 3, p. 490). These are empirical rates over the stated corpus, not worst-case bounds.

limits and assumptions

The 2,045,680 FAR sample pairs were formed by pairing each victim phone sample with computer samples from the other subject and swapping roles (Section 7.1, p. 489). Inference: this construction estimates remote impostors represented by the dataset; it does not measure a targeted co-located attacker.

## technique 4: evaluate remote, similar-environment, and same-media attacks

what it is

The evaluation separates ordinary false acceptance from attacks in which the adversary guesses the victim’s environment or accesses the same broadcast media. It reports denominators for each environment and tests same-media sources whose synchronization can permit false acceptance despite the lag bound.

when to use it

Inference: use separate attack classes when a sensor verifier’s threat depends on environmental predictability. Report each rate with its sample-pair denominator; aggregate FAR can hide a vulnerable setting.

how to do it

1. For remote FAR, pair each victim phone sample with all other-subject computer samples and swap roles (Section 7.1, p. 489).
2. For similar-environment attacks, restrict pairings to matching settings such as Music, TV, Lecture, TrainStation, Office, and Cafe (Section 7.3, pp. 491–492).
3. For same-media attacks, play the same television/radio/web content at different locations and vary providers and cities (Section 7.3, p. 492 and Table 2, p. 491).
4. Count accepted pairs when power exceeds `τ_dB` and score exceeds `τ_C`; report the fraction and denominator (Sections 5.3 and 7.3, pp. 488, 491–492).

Verus form

Inference: represent an attack trace as a sequence of samples and prove the decision predicate’s safety properties for modeled traces. This can establish that implementation follows the selected threshold, but it cannot prove a bound on real-world FAR without a probabilistic/environmental model. Keep empirical rates as evidence outside the proof.

evidence

For similar environments, FAR was 0.012 (1,063/91,960) for Music, 0.003 (311/90,992) for TV, 0.001 (8/7,242) for Lecture, 0.001 (44/67,098) for TrainStation, 0.025 (1,194/47,250) for Office, and 0.001 (32/56,994) for Cafe (Section 7.3, pp. 491–492). Same-media tests ran 100 times per scenario across four cable channels, two web radios, and two web TVs. Table 2 reports FAR = 1 for all four cable channels in the same-city, same-provider setting, versus 0 for both web TVs in every tested setting. Some different-provider settings also had high FAR, including 1 for TV channel 2 in the same city and 0.8 for Web radio 2 in both same-city and different-city tests (Section 7.3, p. 492 and Table 2, p. 491).

limits and assumptions

The attack data are from two subjects and selected environments. The paper explicitly says Sound-Proof cannot withstand co-located attackers (Section 5.3, p. 488). Inference: the overall equal error rate does not bound these same-media attack rates.

## technique 5: usability and fallback engineering

what it is

Section 9 proposes combining Sound-Proof with code-based 2FA for quiet environments, no phone data connectivity, or repeated failures. It also proposes notifications, logs, throttling, and periodic checks for continuous authentication (p. 495). These are discussion proposals, not evaluated prototype features. The authors write: “After a pre-defined number of failed trials, the server can fall-back to a 2FA mechanism based on verification codes.”

when to use it

Inference: use fallback whenever the sensor signal is absent or the user cannot satisfy environmental requirements. Keep recovery and alert behavior separate from the sensor decision so a false rejection does not become account lockout.

how to do it

The following steps describe the options proposed in Section 9; the paper does not evaluate this combined workflow.

1. If either sample is below the power threshold, prompt the user to make noise or offer a verification-code path (Section 9, p. 495).
2. Repeat recording for failed similarity checks; after a bounded number of trials, fall back to codes; the server can also throttle attempts (p. 495).
3. Notify the user of each login attempt with phone vibration, light, or a message; optionally keep a local log (p. 495).
4. Optionally trigger periodic checks during a session and log out on mismatch, accounting for battery and privacy costs (p. 495).

Verus form

Inference: specify a finite authentication state machine with retry counters, throttle deadlines, fallback transitions, and an invariant that no failed sensor comparison bypasses the second factor. Prove liveness only under explicit network and battery assumptions. Do not treat user-interface notifications as evidence that the authentication decision is secure.

evidence

The user study had 32 non-security-expert participants (Section 8.1, p. 493). Sound-Proof’s mean SUS score was 91.09 ±5.44 versus 79.45 ±7.56 for Google 2SV; ANOVA gave F(1,31)=21.698, p<.001, ηp²=.412 (Section 8.2, p. 493). Login time was 4.7 ±0.2 seconds versus 24.4 ±7.1 seconds (p. 493). In the optional-2FA question, 78% said they would use Sound-Proof versus 19% Google 2SV (Figure 7, p. 494).

limits and assumptions

The authors state: “In particular, we did not make the participants aware of the difference in the security guarantees, i.e., the fact that Google 2SV can better resist co-located attacks.” (Section 8, p. 493.) Participants were primed by explanations and used supplied devices in a lab; no login failures occurred (Section 8.2, p. 493). The protocol remains vulnerable to co-located attackers and compromised endpoints.

## what is proved, measured, and trusted

Inference: proved: the authors provide protocol definitions and empirical implementation results, not a machine-checked program-correctness theorem; security claims are conditional on the threat model and empirical evidence

measured: 2,007 login attempts, 2,045,680 FAR pairs, operation times, equal-error rates, environment-specific FARs, and a 32-person usability study with denominators stated above

Inference: trusted: microphone and browser behavior, cryptographic libraries, WebRTC and TLS, phone integrity, server correctness, empirical representativeness, and the threshold-calibration procedure

Inference: threat to agent-written verified Rust is high if a verified implementation is mistaken for a proof of authentication security. Verus can prove state-machine and threshold properties, but environmental soundness, sensor entropy, browser preprocessing, and endpoint integrity remain outside an ordinary proof.

## techniques for the catalog

- multiband correlation — filter synchronized sensor samples into one-third-octave bands and average normalized cross-correlations
- local-decision privacy architecture — encrypt the browser sample to the phone and return only the phone’s decision
- empirical threshold calibration — select power, lag, bands, and score thresholds from FRR/FAR measurements
- threat-specific sensor evaluation — test remote, similar-environment, and same-media attacks with explicit denominators
- fallback authentication state machine — combine sensor checks with retries, throttling, alerts, and code-based recovery
