# PROMISE: Proof Automation as Structural Imitation of Human Reasoning
(authored by agents unless marked 🧑)
Tag: `ahn2026promise`, [paper](https://doi.org/10.48550/arxiv.2604.05399)

## what is proved or measured
PROMISE is a retrieval-grounded, incremental proof-search framework evaluated on Isabelle/HOL proofs from seL4/l4v. The paper's central claim is that proof-state transition structure is a better reusable signal than lexical similarity or static lemma retrieval. It evaluates 223 theorems (100 P1, 100 P2, and 23 P3), counting a theorem only when the local proof closes and a whole-theory Isabelle build succeeds (sec. 4, pp. 16–17). The snapshot contains 2,016 theory files, about 66,913 theorem declarations, 14,776 definitions, and 72,749 indexed proof states (p. 17).

The measured result is Table 4's raw count over 100-instance P1/P2 sets and a 23-instance P3 set. PROMISE solves Qwen2.5-Coder-7B-Instruct P1/P2/P3 at 77/36/7, GPT-3.5-turbo at 85/40 (P1/P2), and GPT-4.1 at 69/33 (P1/P2); the paper reports 55.7% overall across seven model-level settings, versus 34.0% Rango, 26.8% Selene ACC5, and 20.9% Selene ACC1 (sec. 5, pp. 19–20). The P3 denominator is 23, so “7” is 30.4%; the paper explicitly says each P1/P2 level has 100 problems and P3 has 23.

The paper's evidence is replay, not a trust claim about the language model: a generated candidate is executed in Isabelle, and a locally closed proof is rebuilt in an isolated theory and must pass the entire Isabelle build. The authors state: “A proof is accepted only when a candidate both closes the current proof state and passes a final whole-theory consistency check.” (Remark 1, p. 9). The language model, retrieval database, Scala–Isabelle bridge, parser, scoring code, Isabelle kernel and imported seL4 theories remain trusted infrastructure; the model itself is not trusted to certify a proof.

## technique 1: structural proof-state retrieval

what it is and when to use it
The reusable unit is a transition trace: an intermediate goal paired with the suffix of commands that solved the original lemma. Use this when a large proof corpus contains recurring reasoning shapes but different names or syntax. The paper says: “PROMISE retrieves proof-state transition traces to capture structural reasoning patterns across proofs.” (Table 2, p. 7). It contrasts static artifact retrieval, which can be too coarse for context-sensitive goals.

how to do it
1. Build a database from solved lemmas. Replay each original proof command by command and record every intermediate goal and its not-yet-executed proof-command suffix in `proof_suffix.json` (sec. 3.5, p. 12).
2. Parse every intermediate goal with the official Isabelle parser and embed the parsed representation.
3. At a live proof state, parse the current goal, retrieve the top 30 intermediate goals by structural score, rerank them semantically, retain the top eight, fetch their suffixes, and insert them as few-shot examples (sec. 3.5, p. 12).
4. Compute the first score as `s_struct = (1 − d) + α·min(m,c_max) + β·ℓ`, where `d` is embedding distance, `m` overlapping constants, and `ℓ` lexical goal overlap. Rerank with `s_rerank = 0.55 s_struct + 0.35 s_goal + 0.10 s_const` (eqs. 1–2, p. 13).
5. Do not copy a retrieved proof wholesale. Extract tactic templates while hiding concrete theorem arguments, so the model imitates shape and instantiates names from a separate grounded inventory (sec. 3.5, p. 13; Fig. 5, p. 19).

Verus form
Inference: Verus has no Isabelle proof-state bridge, but the same separation can be implemented around `verus`: record verifier states (verification condition, hypotheses, and remaining obligations) while replaying trusted Rust/Verus proofs, retrieve structurally similar states, and provide short `assert`, `requires`, `ensures`, `invariant`, `reveal`, or lemma-call templates. Verus syntax and its available constructs must be checked against the local Verus reference; Isabelle tactics do not carry over. The final acceptance condition should be a successful Verus verification run, not the model's explanation.

evidence and limits
The motivating `akernel_invs` example succeeds with a structurally similar `akernel_invs_det_ext` proof, while Rango retrieves a lexically related but structurally heavier proof and exhausts its rollout budget (sec. 2.4, pp. 7–8). Structural similarity can still be semantically wrong, which is why the second-stage goal/constant rerank exists. Retrieval also assumes a corpus of solved proofs and a parser that exposes meaningful state representations; a new domain with few solved traces cannot benefit as much.

## technique 2: grounded name retrieval and leakage prevention

what it is and when to use it
Structural templates say how a proof tends to evolve; name retrieval supplies facts that are actually available in the current context. Use both channels together when tactic templates need project-specific lemma and definition names. PROMISE gathers names from (1) identifiers in the goal, (2) character n-gram retrieval over repository names/text, (3) interactive theorem search in the live Isabelle context, and (4) verified definitional lemmas (sec. 3.5, pp. 13–14).

how to do it
1. Assemble candidate names and classify them into definitions, simplification lemmas, rule lemmas, and WP/refinement lemmas.
2. For possible `_def` facts, append `_def` to goal identifiers and query PIDE for context-visible definitions; pass candidates through Isabelle and retain only available facts.
3. Exclude the target theorem by name from structural and name retrieval, then run a final self-reference filter (sec. 3.5, p. 14).
4. Put the role-partitioned inventory in the prompt and instruct generation to use only those names (Fig. 5, p. 19).

Verus form
Inference: For Verus, build the inventory from functions, `spec fn`s, proof functions, lemmas, and imported axioms visible in the module; ask the model to use only listed symbols. Filter candidates by compiling/verifying them in the current crate. Exclude the target lemma/function and its generated proof from retrieval to avoid training leakage.

evidence and limits
The paper verifies definitional facts in the live context because repository text alone cannot establish availability. This reduces invented names but does not solve semantic mismatch; every candidate still requires machine checking. The approach assumes the verifier exposes a queryable current context and that naming conventions are useful.

## technique 3: retrieval-grounded beam search with normalization and verifier feedback

how to do it
1. Probe the target theorem in an isolated working theory to obtain initial state `(σ0,A0,g0,k0)` and initialize an empty proof prefix (Algorithm 2, p. 12).
2. At each depth, for every beam node retrieve templates/names, build a grounded prompt, and request short diverse next steps. Algorithm 1's sequence is explicit: retrieve; construct prompt; generate; normalize/filter; verify; collect successes; retain top B; return failure or Q.E.D. (sec. 3.2, p. 9).
3. Normalize outputs by repairing syntax, resolving aliases, removing malformed or duplicate fragments, and adding grounded fallback candidates from validated facts and tactic schemas (sec. 3.7, p. 15).
4. Reject empty, unknown, timeout-prone, unresolved-variable, out-of-inventory, or self-referential candidates before execution.
5. Execute survivors through the Scala–Isabelle bridge. Keep partial successors, memoize normalized task signatures, summarize failures as feedback, and require whole-theory replay for local closure (sec. 3.8, p. 15).
6. Score successors with `s_beam = −k_child − 0.01L + 0.25Δ + b(m)`, rewarding fewer subgoals, shorter prefixes, progress, and underused method families (eq. 4, p. 15). Keep the best B; adapt beam/candidate budgets under timeout pressure; extend depth from 10 to at most 12 when promising states remain (sec. 4, p. 18).

Verus form
Inference: A Verus implementation can maintain a beam of candidate Rust/Verus edits, run `verus` after each short edit, retain states that reduce unsatisfied obligations, and feed diagnostics back to the model. Candidate normalization must preserve valid Rust syntax and Verus constructs; a `proof fn` is compile-time proof code and must not be called as runtime code. Whole-crate verification is the analogue of Isabelle's final theory build. The scoring formula is an inference and must be calibrated for Verus diagnostics.

evidence and limits
Under the stated setup (Ubuntu 24.04.2, 96 logical cores, 503 GiB RAM, four RTX 6000 Ada GPUs; 120-second candidate probes; 600-second baseline verification timeout), PROMISE wins six of seven model-level settings and loses only GPT-4.1/P2 by 33 versus Rango's 35 (sec. 4–5, pp. 17–20). The paper conjectures that its strict few-shot scaffold overconstrains the strongest model in that setting; this is explicitly a conjecture, not a measured causal result. Fixed budgets and reimplemented baselines limit direct comparability, and the benchmark is Isabelle/seL4 rather than Rust/Verus.

## what stays trusted and threat to VL
The Isabelle kernel and whole-theory build provide the correctness boundary; retrieval, model outputs, normalization, scores, and bridge orchestration are untrusted search aids. Inference: for VL, PROMISE is a substantial threat to proof-authoring cost because its stateful retrieval and verifier loop can turn an agent's failed Verus attempts into guided alternatives. It does not remove the need for specifications, invariants, or a final Verus check, and transfer risk is high because Isabelle's tactics and state representation differ from Verus's Rust/SMT workflow. VL should not redo single-shot proof generation or lexical-only retrieval; it should test state-transition retrieval, grounded symbol inventories, short candidate verification, and whole-crate replay on its own corpus.

## contradictions or scope cautions
The abstract advertises “improvements reaching up to +26 points (186% relative gain)” (p. 1), while Table 4's largest displayed absolute gain over Rango is +50 (GPT-3.5 P1: 85 versus 35). These are different comparisons/metrics; the paper does not identify the +26 denominator in the abstract sentence. The reported 55.7% average is across seven model-level settings with unequal P3 availability, so it is not a simple average over all 223 theorem instances.

## techniques for the catalog
- structural proof-state retrieval — index intermediate goals with proof suffixes, rerank structural matches by semantic goal similarity, and use tactic shapes as few-shot guidance
- grounded name retrieval — gather context-valid theorem and definition names separately from structural templates and filter them through the prover
- verifier-guided beam search — generate short candidates, normalize and statically filter them, execute each in the prover, score successor states, and accept only whole-theory replay
- leakage prevention — exclude the target theorem and self-references from every retrieval channel before generation

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
