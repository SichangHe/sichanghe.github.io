# Models That Prove Their Own Correctness
(authored by agents unless marked 🧑)
Tag: `amit2024selfproving`, [paper](https://www.semanticscholar.org/paper/34d30f8997ea244204cc07d83dca9468a2005cc9)

## core construction

The paper defines a Self-Proving model as a learned prover that emits an answer and then interacts with a manually defined verification algorithm. For input `x`, the model emits `y`; over `R` rounds the verifier sends queries and receives answers; it accepts or rejects. Completeness means an honest prover is accepted on correct outputs. Soundness means every prover, including one with unbounded computation and the verifier's code, is rejected with probability at least `1-s` on an incorrect output. The abstract states: "The soundness property of V guarantees that, for every input, no model can convince V of the correctness of an incorrect output." (Abstract, PDF p. 1). Verifiability is the average over the input distribution and model randomness of acceptance, while soundness remains worst-case per input/output.

The distinction matters for verified Rust agents. Inference: a Verus checker or kernel can be the manually defined verifier; generated Rust and proof text are an untrusted prover transcript. A high average pass rate cannot replace per-output rejection of an invalid proof. The paper does not claim that any verifier exists for arbitrary software properties; it explicitly limits itself to capabilities expressible by an interactive proof system (Section 1, PDF p. 2).

## technique 1: interactive proof interface and guarantees

Define a ground-truth function or bounded loss `ell(x,y)`. Choose a polynomial-time verifier `V` with explicit `x,y` and black-box prover access. For each round, derive a query from the partial transcript, accept a response, and decide at the end. Require completeness for honest proofs and soundness for every prover. For general loss, a verifier rejects outputs with `ell(x,y) > lambda`; a model with verifiability `beta` is approximately correct with probability at least `beta-s` by a union bound (Definitions 3.2–3.9, PDF pp. 4–8). This gives a practical contract: acceptance is evidence for that output, while rejected outputs are not silently trusted.

Verus form (inference). Let the verifier be `cargo-verus` plus the Verus kernel checking a generated crate. The output `y` is the executable function and specification; the transcript is the model's proof script and any responses to diagnostics. Soundness is conditional on the verifier's trusted kernel, compiler, and axioms. Interactive queries can be compiler errors or proof obligations, but the paper's probabilistic verifier model does not specify ownership, termination, or side effects.

## technique 2: Transcript Learning (TL)

TL trains on accepting interaction transcripts rather than only answers. A transcript is `pi = (y*,q1,a1,...,qR,aR)` from an honest transcript generator `T_V*`; the generator must be fully supported on transcripts accepted by `V`. Algorithm 1 repeatedly samples `x` and an accepting transcript, walks every token prefix, computes the model probability `alpha_s(theta)` of the target token and its log-probability gradient `d_s(theta)`, then performs gradient ascent and averages the iterates. The paper says: "The idea is to learn a model not just of x ↦ y* for a correct output y*, but of x ↦ y*π*, where π* is a transcript of an interaction in which the verifier accepted." (Section 4.1, PDF p. 9).

How to apply: (1) implement or collect an honest prover and verifier; (2) sample inputs from `mu`; (3) record accepted answer/query/response transcripts; (4) train autoregressively over all transcript tokens; (5) evaluate acceptance, not merely answer accuracy. TL's update estimates the gradient of a surrogate agreement `A(theta)` that lower-bounds verifiability (Lemma 4.2, PDF p. 10). Accepting transcripts can come from a doubly efficient interactive proof, or from backward data generation: sample a proof transcript first and construct an input for which it is accepted (Section 4.1.1, PDF pp. 10–11).

Verus form (inference). Collect verified Rust crates and compiler-diagnostic interaction traces, then train on the full sequence of code, annotations, and repairs. A trace is valid only if the final crate verifies. This is process supervision, but Verus diagnostics are deterministic compiler artifacts rather than the paper's sampled verifier queries.

## technique 3: Reinforcement Learning from Verifier Feedback (RLVF)

RLVF removes the need for an honest transcript generator. Algorithm 2 samples `x`, generates an answer and responses with the current model, emulates the verifier's query generator, and computes token log-probability gradients. It updates parameters only when the complete transcript is accepted. The paper states: "Note that the parameters are updated ... only when an accepting transcript was generated." (Section 4.2, PDF p. 11). This is on-policy policy gradient for the verifier-induced reward; Lemma 4.3 proves that the expected update equals the gradient of verifiability.

Use RLVF when accepted traces can be checked but not cheaply produced by an honest prover. Initialize from a model whose verifiability is bounded away from zero; otherwise accepted transcripts are too rare and learning stalls. The authors recommend TL to produce a somewhat-Self-Proving base, then RLVF to amplify it (Section 4.2, PDF p. 11). Inference for Verus: sample candidate proof crates, run Verus, and apply gradient/reward updates only to accepted crates. This requires a differentiable model and a tractable sampling loop; it does not alter Verus's proof soundness.

## technique 4: annotations as process supervision

Annotated Transcript Learning prepends intermediate computation to the proof during training, then trims it before sending the answer to the verifier. In the GCD experiment, the annotation is the first `T` Euclidean-algorithm steps; an extractor removes the annotation at inference. The paper says: "At inference time, the model is evaluated only on whether it generated the proof π correctly." (Section 6, PDF p. 13). This lets the model learn a long proof process while preserving a compact verifier-facing message.

For Verus, an annotation can contain intermediate invariant states, failed obligations, or ghost calculations; an extractor can retain only the final Rust proof. The inference is ours: Verus does not define an annotation channel, so annotations must be comments, ghost code, or training-only tokens and must not be trusted as proof.

## evidence and convergence

Theoretical TL convergence assumes concave transcript agreement, `B_Lip`-Lipschitz logits, a norm-bounded parameter vector realizing a `(1-epsilon/2)`-Self-Proving model, and at most `C` prover tokens. Theorem 5.1 gives `O(C^2 B_Norm^2 B_Lip^2 / epsilon^2)` samples for an expected `(1-epsilon)`-Self-Proving model (Section 5, PDF p. 12). The authors explicitly call convexity and Lipschitzness simplifying assumptions and leave RLVF convergence for future work.

The experiment trains a 6.3M-parameter GPT on 1,024K GCD samples encoded base 210, with inputs log-uniform on `[10^4]`; evaluation uses 1,000 held-out pairs (Section 7.1, PDF pp. 14–15). The one-round Bezout verifier has perfect soundness: if `y` is not the GCD, every proof is rejected. Table 2 reports correctness/verifiability: baseline GPT 99.8%/—, GPT+TL 98.8%/60.3%, GPT+TL+RLVF 98.9%/78.3%, and GPT+ATL 98.6%/96.0% (Table 2, PDF p. 14; denominator 1,000 held-out pairs for reported evaluation). The text also reports TL at 100K iterations (about 100M samples), RLVF's increase from about 40% to 79.3% over four million iterations, and ATL's 96% at 100K iterations (Section 7.1, PDF p. 14). A representation study trains 68 bases grouped by number of prime divisors and finds a statistically significant but few-percentage-point correlation with verifiability; the authors attribute the small effect to using 10% as many training samples (Section 7.3, PDF p. 16).

## trusted boundary, limitations, and VL impact

Trusted components are the verifier algorithm, its soundness proof, the model architecture's ability to represent an honest prover, and the data distribution used for average-case verifiability. The learned model, transcript generator, and RLVF optimizer are not trusted for correctness; they only improve the chance of acceptance. The empirical task is tiny arithmetic, one round, and a perfect verifier, so it does not establish performance on concurrent Rust, unsafe code, quantified heap properties, or nontermination.

Inference: VeruLaw should treat the paper as a design pattern for verifier-mediated training. It supports collecting complete Verus proof transcripts, using compiler acceptance as a sparse reward, and adding training-only intermediate annotations. It does not remove the need for independent Verus checking, and its average-case `beta` guarantee does not imply that every generated crate verifies. Existing work on formal-proof generation already supplies the kernel-checking endpoint; Inference: VL should not redo a pipeline that trusts generated text without kernel checking. The novel product risk is operational: a model may optimize for verifier acceptance on a narrow distribution and miss rare Rust states, so coverage and adversarial inputs remain necessary.

## techniques for the catalog

- self-proving verifier interface — require a model to emit an answer and pass an interactive, sound verifier whose rejection guarantee is worst-case per output
- transcript learning — train on complete accepting answer/query/response transcripts and optimize token agreement with an honest transcript generator
- reinforcement learning from verifier feedback — emulate verifier queries and update the model only after an on-policy transcript is accepted
- annotated transcript learning — expose intermediate proof steps during training and strip them before verifier-facing inference
- verifier-mediated convergence analysis — relate proof-token length, parameter norm, Lipschitzness, and target error to TL sample complexity

Checked 2026-10-15 against the paper by a Codex agent for models_that_prove_their_own_correctness_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
