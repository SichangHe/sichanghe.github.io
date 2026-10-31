# SCOPE: Certified Theorem Proving with a Language Model as the Policy Planner
(authored by agents unless marked 🧑)
Tag: `zhou2026scope`, [paper](http://arxiv.org/abs/2610.08319v1)
## architecture
SCOPE separates proof decisions, exact computation, and proof text. A 135M SmolLM2 planner chooses one operator and its arguments at each step from a finite vocabulary; a deterministic symbolic engine executes that decision in exact integer/rational arithmetic and returns a new state plus an execution certificate; a compiler expands the chain into Lean tactics; Lean then checks the proof. The paper summarizes the division as: “the model plans over an operator vocabulary, a symbolic engine executes the numerics, and a compiler renders the proof.” (abstract, p. 1). The chain ends with an explicit terminator and uses 194 operators initially, 220 after public-library extension (section III-A, pp. 3–4).

The paper reports that “the compiler reproduces the reference proofs byte for byte on all 2,399 corpus rows” (section III-D, p. 5). A problem is encoded as an integer vector s. A chain is pairs (o_t,a_t). The model predicts operator and discretized argument distributions conditioned on s and prior executed steps. At inference, it takes the highest-probability legal item at each step. The engine rejects illegal arguments and produces a fixed-dimensional state. The compiler calls no language model; every number in the Lean text comes from engine computation (sections III-B–D, pp. 4–5).

## technique: constrained operator planning
Use this when free-form proof text fails because every numeric token must be correct. Define a finite operator vocabulary with executable semantics, legal argument sets, and a state representation. Train cross-entropy on reference chains with operator loss plus argument loss scaled by 1/24 (equation 10, p. 5). At each step: read the current state frame; choose operator and arguments; execute and record certificate; stop at terminator or budget; compile the recorded chain.

Inference: for Verus, operators can denote specification-preserving transformations such as `assert`, `reveal`, arithmetic normalization, or calls to approved lemmas. A Rust-side engine can compute constants, while a compiler emits Verus source. The Verus verifier remains the final authority; a finite operator vocabulary reduces syntax and API hallucination but does not prove operator semantics by itself.

## technique: deterministic symbolic execution with certificates
Each operator has an execution function returning a numeric result and checkable certificate. For sum-of-squares, the engine updates residual `Rout = Rin − m ℓ²`; the final residual is classified as zero, a square in {4,9,16,25,36,49}, or other (section III-B, p. 4). A grid identity and an absorption criterion certify that a square was removed exactly; invalid arguments are rejected. Exact arithmetic avoids floating point. The paper states: “The compiler calls no language model and reads no reference proof text.” (section III-D, p. 5).

Inference: a Verus implementation should use a trusted or separately verified arithmetic kernel for certificates, serialize each step's inputs/outputs, and have Verus prove that emitted assertions match the certificate. A finite grid check is evidence only for the stated bound; it is not a universal proof unless the theorem establishes the reduction.

## technique: compiler-generated proof text
Templates map each legal operator to Lean tactics. Examples include `norm_num, nlinarith` for a sum-of-squares tail, `rw and ring inside induction` for nested induction, `ring` for polynomial identities, and `intro` for a binder (table II, p. 5). The compiler's validation is byte-level reproduction on 2,399 corpus rows and certification on 218 reference-chain test problems (section III-D, p. 5). Therefore all learned risk is concentrated in chain decisions.

Inference: Verus templates should emit only constructs documented in the local Verus reference, such as `assert`, `requires`, `ensures`, `invariant`, and `lemma` declarations. The template must never attach `ensures` to a `spec fn` or call a proof function at runtime; generated code still needs a full Verus check.

## technique: audit and reverse verification
SCOPE uses a version-frozen review program with an MD5 checksum, independent stratified re-review, and reverse tests in which truncated or substituted proofs must be rejected (section III-E, p. 6). It logs every operator, argument, residual, certificate, compiled proof, and verdict, allowing step-level error localization. The final system averages 6.12 decision actions and 0.53 seconds per problem with 833 MiB peak memory (abstract, p. 1).

## evidence and failure modes
On a 218-problem suite, SCOPE certifies 191/218 = 87.6% with 135M parameters. DeepSeek-Prover-V1.5-RL certifies 18/218 with 27.5× tokens and 37.5× wall-clock; DeepSeek-Prover-V2-7B certifies 0/218 on a bidirectional suite (abstract, p. 1). Direct generation has token accuracy 0.9637 but 0/218 certified passes; a same-distribution 20-problem control has 1 pass, near the predicted 0.031 (introduction, p. 2). Replacing lagged engine state with current state raises passes 117/218→191/218; end-loss upweighting lowers 117→110 and shifted 191→172 (abstract, p. 1). The public Lean Workbook extension certifies 2,132/3,536 gradeable admissible problems = 60.29% (abstract, p. 1).

The paper reports all 101 first errors at the final chain step, with residual correspondence 799/799 corpus and 181/181 test rows (introduction, p. 2). Trusted components include Lean compiler/kernel, deterministic engine implementation, compiler templates, review program, and the generated reference corpus. Inference: threat to agent-written verified Rust is substantial but bounded: restricting the model to policy decisions can sharply improve proof reliability, yet the engine and templates become a larger trusted computing base and must be independently audited.

## techniques for the catalog
- operator-vocabulary planning — predict typed proof operations instead of unrestricted proof text
- exact symbolic execution — compute numerics externally and return a checkable state/certificate
- template proof compilation — render verifier code deterministically from validated chains
- legality-constrained decoding — restrict arguments with per-operator admissibility sets
- version-frozen audit — replay, checksum, independently recheck, and reverse-test accepted proofs
- state-visible decision loops — feed each engine result into the next policy decision
