# Seeing is Living? Rethinking the Security of Facial Liveness Verification in the Deepfake Era
(authored by agents unless marked 🧑)
Tag: `li2022seeing`, [paper](https://www.usenix.org/conference/usenixsecurity22/presentation/li-changjiang)

## scope and result
The paper studies commercial facial liveness-verification (FLV) APIs under deepfake attacks. It introduces LiveBugger, evaluates image, silence, voice, and action FLV, explores factors that change attack success, and reports proof-of-concept attacks against client applications. The abstract states: “we present LiveBugger, a new deepfake-powered attack framework that enables customizable, automated security evaluation of FLV.” (Abstract, p. 2673)

Inference: For VeruLaw, the transferable lesson is an evaluation harness that probes a black-box verifier, generates adversarial inputs, and records separately which checks were evaded. This is a testing and threat-model technique, not a formal proof of Rust code.

## technique: probe undocumented defenses
Use the Intelligence Engine to collect each vendor's documented features, take their union as a configurable interface, and send probing datasets to discover implicit behavior. For coherence detection, make a normal video set and a set with each video's frame order scrambled; similar bypass rates imply no coherence check. For lip-language detection, compare matched audio/video, mismatched audio/video, and videos with audio but no lip movement. For presentation-attack detection, compare normal and replayed videos. The paper says: “If the normal dataset and the disturbed one achieve similar success rates, then the target cloud vendor has not deployed the coherence detection; otherwise is the opposite.” (Sec. 3.1, p. 2676)

Inference: Verus form: model a verifier as an opaque specification boundary and prove properties of the local probe generator and metric aggregation. Use `requires` for dataset-shape assumptions and `ensures` for preservation of labels and counts; keep API responses as uninterpreted values. The paper's empirical inference cannot become a Verus theorem about a remote service.

Evidence: Sec. 3.1 (p. 2676) describes probing coherence, lip-language, and presentation-attack detection using returned API results. Sec. 2.2 (p. 2675) specifies black-box access. Inference: extending the probe results to other inputs requires representative probing data; the experiments do not establish formal soundness.

## technique: modular deepfake evaluation pipeline
Configure a target API, select a target identity image and driving image/video, synthesize media with one of six one-shot methods, submit it, and pass outputs to the Analysis Engine. Image FLV uses a passing driving image and face swapping because reenactment cannot repair background conditions. Silence FLV uses random driving videos with swapping or reenactment. Voice FLV synthesizes the required audio and imports it into a video; if lip-language detection exists, interactively record a driving video with matched lip movement. Some APIs only check that lips move. Action FLV stitches prerecorded action clips when coherence is absent. The paper specifies three modules: “LiveBugger consists of three main components as illustrated in Figure 3: Intelligence Engine, Deepfaker Engine, and Analysis Engine.” (Sec. 3, p. 2675)

Inference: Verus form: represent each pipeline stage as a pure specification over typed media metadata and prove consistency of declared action/audio labels before an effectful submission wrapper. Such a proof does not establish that the synthesized media actually meet the requirements. Rust code that invokes models remains trusted or externally tested; Verus can prove bookkeeping, bounds, and stage contracts.

Evidence: Sec. 4.1 (p. 2677) lists six methods (X2Face, ICface, FSGANS, FSGANR, FOMM, FaceShifter) and a server with four GTX 1080 Ti GPUs. Sec. 2.2 (p. 2675) specifies one victim image. Sec. 4.1 requires acceptable synthesis latency to avoid API timeouts; Sec. 8.5 (p. 2685) limits coverage to selected methods and mainly one-shot inputs.

## technique: decompose security into measurable rates
For every synthesized item, record liveness evasion, anti-deepfake evasion, face matching, and overall evasion. Overall evasion is the fraction passing all three checks. The paper defines: “A larger rate implies higher attack effectiveness or less security of the target API.” (Sec. 3.3, p. 2677)

Inference: Verus form: define counters over the same sample set and prove `overall <= liveness`, with denominators carried in a record; use integer counts to avoid floating-point proof ambiguity. This supports auditability but does not prove the API's detector is sound.

Evidence: Table 2 (p. 2678) evaluates legitimate images and defines false-positive rate as 100% minus the relevant evasion/matching rate. Sample designs differ: Sec. 4.2 (p. 2678) uses 100 failing target images and 10 passing driving images per vendor; Sec. 4.3 (p. 2679) uses 40 target images and five driving videos. Inference: compare rates with their experiment settings and denominators.

## technique: customize a two-stage attack
Stage 1 transforms the obtained target image with FaceShifter so it passes image FLV, improving reenactment input. Stage 2 uses a reenactment model with adversarial training, motivated by the observed benefit of adversarial training. Combining stages gives the highest reported rate: on BD, original FOMM has 22% overall evasion, Stage 1 86%, Stage 2 39%, and both 92% (Table 7, Sec. 5.5, p. 2683). The experiment uses 20 randomly selected target images and five driving videos (Sec. 5.5, p. 2683). Inference: these measured percentages do not establish success probabilities for arbitrary inputs.

Inference: Verus form: prove that image transformation precedes reenactment and preserve media metadata; record success rates as experimental observations rather than axioms about arbitrary inputs.

## what is proved, trusted, and useful to VL
The work reports black-box measurements and vendor acknowledgments (Secs. 2.2 and 8.1, pp. 2675 and 2684). Sec. 4.1 (p. 2677) says: “Since FaceShifter is not open-source, we reproduce it according to our understanding of the original paper.” Inference: the paper provides empirical evidence rather than a theorem about FLV; its results depend on commercial APIs, model implementations, datasets, and the authors' FaceShifter reproduction. Inference: for VL, an agent-written verified Rust service is threatened when it delegates identity or liveness decisions to unmodeled ML/API components; Verus can still reduce risk in orchestration, input validation, and metric accounting. Inference: VL can reuse the three-component evaluation pattern and its rate decomposition when testing a remote verifier.

## techniques for the catalog
- defense probing: distinguish undocumented checks by contrasting matched and deliberately disturbed probe datasets
- modular adversarial evaluation: configure a target, synthesize one-shot inputs, submit them, and report stage-specific evasion rates
- two-stage input shaping: first make an input pass a prerequisite detector, then apply an adversarially trained synthesizer
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "For example, FaceShifter with the passed driving video can achieve an overall evasion rate of 96% on CW, while with the failed driving video, it can only achieve an overall evasion rate of 51%."): checked all study claims, quotations, numbers, section/page references, and technique steps against the full paper including appendices; corrected the publisher link, coherence quotation capitalization, component quotation and location, lip-language probe description, sample descriptions, component count, and unsupported FaceShifter and stage-selection wording; marked proposed Verus uses and conclusions as inferences; did not reproduce experiments, inspect implementation code, or verify current vendor behavior.
