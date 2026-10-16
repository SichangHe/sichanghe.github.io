# Sound-Proof: Usable Two-Factor Authentication Based on Ambient Sound
(authored by agents unless marked 🧑)
Tag: `karapanos2015soundproof`, [paper](https://www.usenix.org/system/files/conference/usenixsecurity15/sec15-paper-karapanos.pdf)

## scope and result

Sound-Proof is a two-factor authentication protocol in which a phone and browser record ambient sound and the phone decides whether the devices are co-located. The user enters only username and password; the phone receives the browser’s encrypted recording, computes a similarity score locally, and reports a Boolean result to the server. The paper’s abstract states: “Sound-Proof does not require interaction between the user and his phone.” (Abstract, p. 483.) The prototype targets Android, iOS, WebRTC-capable browsers, and a remote threat model.

The protocol is designed against a remote adversary who knows the username and password but cannot compromise the phone or victim computer. It explicitly does not address co-located attackers, man-in-the-browser attacks, or active phishing (Section 2, p. 484). Thus the security claim is conditional and narrower than general two-factor authentication.

## technique 1: one-third-octave filtering plus normalized cross-correlation

what it is

The similarity score combines time and frequency information. Each sample is filtered into one-third-octave bands; each corresponding pair is compared with maximum normalized cross-correlation over a bounded lag; the score is the average of those maxima. The paper says: “In order to consider both time domain and frequency domain information of the recordings, we use one-third octave band filtering and cross-correlation.” (Section 4, p. 486.)

For two n-point signals, cross-correlation is `c_x,y(l) = sum x(i) y(i-l)`. Normalization divides by the square root of the two auto-correlations, mapping the value to [-1,1]. The absolute maximum over lag is used when alignment is uncertain (Section 4, p. 486).

when to use it

Use this construction when two recordings contain the same short-lived ambient events but differ in microphone gain, attenuation, and small clock offsets. It is a proximity discriminator, not an audio identity proof.

how to do it

1. Record synchronized browser and phone samples for `t` seconds (Section 5.2, p. 487).
2. Filter each signal into the selected one-third-octave bands (Section 5.1, p. 487).
3. For each band pair, calculate normalized cross-correlation for lags from zero to `l_max` (Sections 4 and 5.1, pp. 486–487).
4. Take the absolute maximum correlation for each band and average them to obtain `S_x,y` (Section 5.1, p. 487).
5. Require both samples’ average power to exceed `τ_dB` and `S_x,y` to exceed `τ_C`; otherwise reject (Section 5.2, p. 487).

Verus form

Inference: model samples as finite `Seq<i32>` or `Seq<f64>` only if the arithmetic theory and trusted numeric library are explicit. Define pure specifications for band extraction, correlation, and threshold decisions; prove bounds and determinism with `spec fn` and `proof fn`. Executable FFT/filter code needs contracts connecting its output to the mathematical model. Floating-point rounding, microphone drivers, and WebRTC processing remain trusted unless modeled.

evidence

The authors collected 2,007 login attempts (4,014 audio samples) across environments, activities, phone positions, and two phone/computer models (Section 7, p. 489). With bands [50 Hz–4 kHz], the equal error rate was 0.0020 at `τ_C = 0.13` (Figure 3, p. 490). Their threshold selection used the collected sample corpus rather than a formal proof.

limits and assumptions

The paper warns that browser audio preprocessing differs. Firefox produced an equal error rate of 0.012 in their test, while Opera behaved like Chrome (Section 9, p. 494). Cross-correlation can be fooled by synchronized media sources; it cannot resist a co-located attacker who records the same ambient sound.

## technique 2: encrypted browser sample and phone-local decision

what it is

The browser encrypts its audio sample under the phone’s public key. The phone decrypts it, compares it with its local recording, and sends only the decision to the server. The paper states: “For privacy reasons, we do not upload cleartext audio samples to the server.” (Section 5, p. 487.) Communication is proxied through the server, avoiding browser plug-ins or short-range APIs.

when to use it

Use this architecture when the verifier should not receive raw sensor data and a mobile token can perform the comparison. It still requires a trusted phone application, a server, and a public-key enrollment step.

how to do it

1. Enroll the phone application and bind its unique public key to the user account (Section 5.2, p. 487).
2. At login, send the phone public key to the browser after password verification (p. 487).
3. Record on both devices while synchronizing timestamps with the server (p. 487).
4. Encrypt the browser sample with fresh AES-256 and encrypt the symmetric key with RSA-2048 under the phone key (Section 6, p. 488).
5. Proxy the ciphertext to the phone; decrypt and compare locally; send the Boolean result to the server (Sections 5.1–5.2, pp. 487–488).

Verus form

Inference: represent the enrollment binding and protocol state as a Verus state machine. Use transition invariants to require that a decision corresponds to the enrolled key and a fresh session nonce; use `requires`/`ensures` for authenticated message handling. Cryptographic primitives and browser transport should have verified contracts or explicit assumptions. Verus can prove state-machine safety but does not prove the phone OS, WebRTC, or RSA/AES implementations.

evidence

The prototype uses CherryPy/MySQL, WebSocket, HTML/JavaScript, AES-256, RSA-2048, and WebRTC; it requires no browser modification or plugin (Section 6, p. 488). Average verification time was 4,677 ms ±181 ms over WiFi and 4,944 ms ±233 ms over cellular for 1,000 attempts per connection type (Table 1, p. 488).

limits and assumptions

The server can still access the browser microphone after permission, and a malicious server could record it; only the phone sample is kept off-server (Section 9, p. 494). The design assumes the phone is not compromised and the server’s login protocol is otherwise sound.

## technique 3: synchronization and threshold calibration

what it is

The devices synchronize clocks with the server during recording, then adjust sample timestamps. The lag bound `l_max` is set to the largest observed synchronization error. The authors use a power threshold to reject silence and a correlation threshold selected from false-rejection and false-acceptance curves.

when to use it

Use synchronization whenever sensor samples must be compared across devices. Calibrate thresholds against the intended environment and threat model; a threshold selected on one browser or microphone pair may not transfer.

how to do it

1. Run a simple HTTP time-synchronization protocol while recording (Section 6, p. 488).
2. Adjust each timestamp by its measured offset after recording (p. 488).
3. Set `τ_dB = 40 dB`; discard the five of 2,007 attempts whose average power was below that threshold (Section 7.1, p. 489).
4. Set `l_max = 150 ms`, the largest measured clock difference (p. 489).
5. Search one-third-octave ranges and choose the band set and `τ_C` using FRR/FAR and equal-error rate (Section 7.1, p. 489).
6. Use [50 Hz–4 kHz] and `τ_C = 0.13` for the reported equal-error operating point (Figure 3, p. 490).

Verus form

Inference: encode the protocol’s time and threshold parameters as immutable configuration with proof obligations that `0 <= l <= l_max` and rejection follows when power or score is below threshold. A calibrated value is an assumption backed by measurements, not a theorem. Use ghost state to record the calibration dataset identifier and environment if reproducibility matters.

evidence

Clock difference averaged 42.47 ms ±30.35 ms in the prototype (Section 6, p. 489). The equal-error rate was 0.0020 at the selected threshold (Figure 3, p. 490). These are empirical rates over the stated corpus, not worst-case bounds.

limits and assumptions

The 2,045,680 FAR sample pairs were formed by pairing each victim phone sample with computer samples from the other subject and swapping roles (Section 7.1, p. 489). This construction estimates remote impostors represented by the dataset; it does not measure a targeted co-located attacker.

## technique 4: evaluate remote, similar-environment, and same-media attacks

what it is

The evaluation separates ordinary false acceptance from attacks in which the adversary guesses the victim’s environment or accesses the same broadcast media. It reports denominators for each environment and tests whether the bounded lag prevents synchronized playback from matching.

when to use it

Use separate attack classes when a sensor verifier’s threat depends on environmental predictability. Report each rate with its sample-pair denominator; aggregate FAR can hide a vulnerable setting.

how to do it

1. For remote FAR, pair each victim phone sample with all other-subject computer samples and swap roles (Section 7.1, p. 489).
2. For similar-environment attacks, restrict pairings to matching settings such as Music, TV, Lecture, TrainStation, Office, and Cafe (Section 7.3, p. 492).
3. For same-media attacks, play the same television/radio/web content at different locations and vary providers and cities (Section 7.3, pp. 492–493).
4. Count accepted pairs when power exceeds `τ_dB` and score exceeds `τ_C`; report the fraction and denominator (Sections 5.3 and 7.3, pp. 488, 492–493).

Verus form

Inference: represent an attack trace as a sequence of samples and prove the decision predicate’s safety properties for modeled traces. This can establish that implementation follows the selected threshold, but it cannot prove a bound on real-world FAR without a probabilistic/environmental model. Keep empirical rates as evidence outside the proof.

evidence

For similar environments, FAR was 0.012 (1,063/91,960) for Music, 0.003 (311/90,992) for TV, 0.001 (8/7,242) for Lecture, 0.001 (44/67,098) for TrainStation, 0.025 (1,194/47,250) for Office, and 0.001 (32/56,994) for Cafe (Section 7.3, p. 492). Same-media tests ran 100 times per scenario across four cable channels, two web radios, and two web TVs; synchronized providers produced higher acceptance, while different providers and cities reduced similarity (Section 7.3, pp. 492–493).

limits and assumptions

The attack data are from two subjects and selected environments. The paper explicitly says Sound-Proof cannot withstand co-located attackers (Section 5.3, p. 488). A remote adversary who can control a broadcast source or predict exact content may perform better than the test sample.

## technique 5: usability and fallback engineering

what it is

The system combines transparent audio authentication with fallback code-based 2FA for quiet environments, no phone connectivity, or repeated failures. It can notify the user by vibration or log attempts, throttle retries, and run periodically as continuous authentication (Section 9, pp. 494–495).

when to use it

Use fallback whenever the sensor signal is absent or the user cannot satisfy environmental requirements. Keep recovery and alert behavior separate from the sensor decision so a false rejection does not become account lockout.

how to do it

1. If either sample is below the power threshold, ask the user to make noise or offer a verification-code path (Section 9, p. 494).
2. Repeat recording for failed similarity checks; after a bounded number of trials, fall back to codes and throttle attempts (p. 494).
3. Notify the phone of each login attempt with vibration, light, message, or a local log (p. 494).
4. Optionally trigger periodic checks during a session and log out on mismatch, accounting for battery and privacy costs (p. 494).

Verus form

Inference: specify a finite authentication state machine with retry counters, throttle deadlines, fallback transitions, and an invariant that no failed sensor comparison bypasses the second factor. Prove liveness only under explicit network and battery assumptions. Do not treat user-interface notifications as evidence that the authentication decision is secure.

evidence

The user study had 32 non-security-expert participants (Section 8.1, p. 493). Sound-Proof’s mean SUS score was 91.09 ±5.44 versus 79.45 ±7.56 for Google 2SV; ANOVA gave F(1,31)=21.698, p<.001, ηp²=.412 (Section 8.2, p. 493). Login time was 4.7 ±0.2 seconds versus 24.4 ±7.1 seconds (p. 493). In the optional-2FA question, 78% said they would use Sound-Proof versus 19% Google 2SV (Figure 7, p. 494).

limits and assumptions

The study measured perceived usability and login time, not security. Participants were primed by explanations and used supplied devices in a lab; no login failures occurred (Section 8.2, p. 493). The protocol remains vulnerable to co-located attackers and compromised endpoints.

## what is proved, measured, and trusted

proved: the authors provide protocol definitions and empirical implementation results, not a machine-checked program-correctness theorem; security claims are conditional on the threat model and empirical evidence

measured: 2,007 login attempts, 2,045,680 FAR pairs, operation times, equal-error rates, environment-specific FARs, and a 32-person usability study with denominators stated above

trusted: microphone and browser behavior, cryptographic libraries, WebRTC and TLS, phone integrity, server correctness, empirical representativeness, and the threshold-calibration procedure

Inference: threat to agent-written verified Rust is high if a verified implementation is mistaken for a proof of authentication security. Verus can prove state-machine and threshold properties, but environmental soundness, sensor entropy, browser preprocessing, and endpoint integrity remain outside an ordinary proof.

## techniques for the catalog

- multiband correlation — filter synchronized sensor samples into one-third-octave bands and average normalized cross-correlations
- local-decision privacy architecture — encrypt the browser sample to the phone and return only the phone’s decision
- empirical threshold calibration — select power, lag, bands, and score thresholds from FRR/FAR measurements
- threat-specific sensor evaluation — test remote, similar-environment, and same-media attacks with explicit denominators
- fallback authentication state machine — combine sensor checks with retries, throttling, alerts, and code-based recovery
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The FAR for the Music and the TV environments were 0.012 (1063 over 91960 attempts) and 0.003 (311 over 90992 attempts), respectively."): checked all 16 pages including appendices and references, quotations, numbers, sections, protocol steps, measurements, and tag; corrected no substantive claims; link from the fetch record; did not check implementation source or reproduce experiments.
