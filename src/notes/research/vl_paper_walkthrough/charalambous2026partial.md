# Partial Contracts Suffice: Sound, LLM-Inferred Regression Verification
(authored by agents unless marked 🧑)
Tag: `charalambous2026partial`, [paper](https://www.semanticscholar.org/paper/498feacc67a31cbbc326dd94b681715b5701e7320)

## scope and result

The paper presents a modular regression-verification method for C. A changed function is checked against its old implementation through a contract that over-approximates only the old version and constrains the output observed by callers. The central result is safety-preserving conditional equivalence: behavior that satisfied the old safety property must agree with the new behavior on the observed projection. The contract is inferred by an LLM but accepted only after ESBMC proves enforcement and replacement; the model is not part of the trusted computing base. The paper states: "The model is never trusted: it proposes a contract, the verifier enforces it against the old version, and only an enforced contract is used, so a wrong guess is rejected rather than believed." (Section I, PDF p. 2).

## technique 1: property-relative, one-sided partial contracts

What it is. A function contract is `(requires, ensures, assigns)`. Its admit set contains all input/output pairs satisfying the precondition, postcondition, and frame; outside `requires`, it admits every output. Enforcement proves `[[f_old]] ⊆ [[C]]`. Replacement calls are abstracted by asserting `requires`, havocing `assigns`, and assuming `ensures`, so the old body is replaced by an over-approximation. The contract need be precise only where the caller's property observes behavior. The paper's `shrink` example has old code leaving `o->h` unchanged, new code subtracting two, and a caller reading only `o->w`; the inferred contract ensures `o->w == b->w - 2` and says nothing about `o->h` (Section I, PDF pp. 2–3). The paper explicitly warns that replacement can produce spurious divergences when the contract is loose, which is incompleteness rather than unsoundness (Section III-C, PDF p. 4).

When to use it. Use it for a refactoring or bug fix where a caller-visible property should be preserved while unrelated state may legitimately change. Define the scope `Sc` as old inputs whose runs satisfy property `phi`, and define `E_phi` as equality on the return values or locations observed by that property. Then require (1) enforcement of the old body and (2) the replacement contract to satisfy `E_phi` against every new-body output. The theorem's proof uses enforcement to place the real old output inside the contract and replacement to quantify over all contract outputs (Section IV-A, PDF pp. 5–6).

How to apply it.
1. Select `Sc` and the observed projection, from the safety property and caller dataflow (the paper's `usable_width` observes only `o.w`; Section I, PDF p. 2).
2. Propose `requires`, `ensures`, and `assigns` for the old function.
3. Run enforcement. Reject a contract if any old execution violates the postcondition or frame; guard an unsatisfiable precondition with a vacuity probe, reporting it inconclusive (Section II-C and Remark 1, PDF pp. 4–5).
4. Replace the old call by the contract and run the new version concretely, asserting `E_phi` (Section IV-C, PDF p. 7).
5. Accept only if both queries verify. A contract that is too weak causes a spurious counterexample; strengthening is needed for completeness.

Verus form (inference). In Verus, express `requires`, `ensures`, and frame facts as function specifications and `old(...)` snapshots; use `#[verifier::external_body]` only for a callee whose specification is being assumed, never for the function whose body is being verified. A caller-visible projection can be an `ensures` clause over selected fields, while unchanged memory is stated with quantified `old` values or suitable collection/map equality. Verus has no direct ESBMC `havoc` call-site mode, so replacement is represented by proving callers from the callee's spec. This is an inference because the paper uses ACSL/ESBMC, not Verus.

Evidence. On EqBench-C (147 equivalent and 125 non-equivalent C pairs; 272 total), the contract-free REGVER arm decided 70 pairs and had 56 correct, 14 false positives, and zero false negatives. With contracts, Opus decided 105 (65 correct, 40 false positives, zero false negatives), Kimi 106 (67, 39, zero), and Qwen 102 (63, 38, one false negative attributed to the dataset's triangularMod label) (Table IV, PDF p. 9). The authors found nine EqBench pairs mislabeled equivalent. The guarantee assumes terminating runs, a sound frame rule under aliasing, and a sound verifier; nontermination regressions are outside the theorem (Section IV-A, PDF p. 6).

## technique 2: depth-bounded contract closure

What it is. For a call graph rooted at target `g0`, choose depth `N`. Functions at depth less than `N` receive inferred partial contracts. At depth `N`, use a boundary contract with true precondition and postcondition and a frame that havocs every reachable location; deeper bodies are not analyzed. Lemma L1 proves by induction that this closure still over-approximates the root. The paper states: "Functions at distance d(g) < N along the static call graph receive precise partial contracts of T1's shape; functions at d(g) = N receive deliberately weak boundary contracts" (Section IV-B, PDF p. 6).

Steps: build a static call graph; assign depths; infer and enforce interior contracts bottom-up; install weak boundary contracts; verify the root with replacement. Increase `N` when precision is insufficient. The bound trades precision for scalability and handles interprocedural X509 functions (Section IV-B, PDF pp. 6–7).

Verus form (inference). Define specs for callees in the depth closure, use an explicit `decreases` measure for recursive calls, and model a boundary callee with an abstract specification whose postcondition permits any reachable mutation. Verus's borrow checker limits the arbitrary havocing that C permits; the boundary must instead expose a conservative owned-state abstraction.

## technique 3: counterexample-guided SCRIBE inference

SCRIBE is the inference loop in the CONTRACTOR–SCRIBE–REGVER system. CONTRACTOR parses C with tree-sitter and creates harnesses. SCRIBE asks an LLM for a JSON-schema contract, runs ESBMC enforcement, and feeds concrete frame counterexamples (file, line, address expression) into the next prompt. The paper says: "When ESBMC enforces a proposed contract C (0) against f1's body and the frame check fails, its frame-rule pass recovers the offending write ... and SCRIBE feeds that trace, not a bare verification-condition failure, into the next prompt." (Section IV-B, PDF p. 7). REGVER stages old symbols beside the new version and compiles the replacement equivalence harness (Section IV-C, PDF p. 7).

Use this when hand-written frame conditions are unavailable. Iterate at most five times; accept only a contract passing enforcement and replacement. With Opus, Kimi, and Qwen at temperature zero, ESBMC/Z3, 300-second per-query and per-call limits, and a 104-GB process cap, Frama-C-Problems success was respectively 36/51 (70.6% decided; 85.7% when non-results excluded), 40/51 (78.4%; 85.1%), and 36/51 (70.6%; 81.8%); X509 success was 5/6, 5/6, and 3/6 (Table I, PDF p. 8). Most targets passed in one refinement iteration (Figure 2, PDF p. 9). Non-results include timeout, crash, solver error, unreadable exit, or API failure and are charged as failures in the conservative rate.

Verus form (inference). Feed Verus compiler diagnostics and failed proof obligations back to a model, but gate every edit by `cargo-verus` verification. Preserve the paper's separation: generated text is untrusted; only Verus's proof result accepts it.

## technique 4: semantic tightness ordering

JUDGE compares two enforced contracts by set inclusion of their admit sets. It runs two SMT validity checks, `A ⊆ B` and `B ⊆ A`, returning equivalent, one strictly tighter, or incomparable with witnesses. The paper says: "A trivially true postcondition adds to the count without adding constraint. We replace it with a decision procedure for contract subsumption." (Section IV-D, PDF p. 7). For enforced contracts, a tighter contract cannot lose a regression proof that a looser one discharges (Theorem T2).

In the warm-start HARDSCRIBE arm, strengthen a partial contract up to five rounds, retaining only enforce-passing versions, and compare each round with JUDGE. Saturation denominators are fixed to orderable targets: 16/18/19 for Opus/Kimi/Qwen. At round zero, 40/42 Opus, 43/47 Kimi, and 38/42 Qwen were already saturated; endpoint comparisons found equivalent:tighter counts of 18:2, 13:2, and 14:4 respectively, with partial/full pass counts 36/36, 40/41, and 36/36 (Table III, PDF p. 9). The authors caution that JUDGE's primitive-signature harness cannot order quantified or pointer postconditions (about 40% of round comparisons), and warm-start strengthening cannot discover a different clause shape (Section V-E/F, PDF pp. 9–10).

Verus form (inference). Compare two `ensures` relations by proving implication in both directions with ghost predicates or lemmas; retain frame and precondition equality. This is a semantic relation, not a count of annotations.

## what is proved, trusted, and limiting

Proved: Theorem T1 gives sound conditional-equivalence transfer from enforcement plus replacement; Lemma L1 lifts it through a finite call-depth closure; Theorem T2 gives proof-power monotonicity for enforced subset contracts. Measured: inference success, convergence, tightness saturation, and EqBench reach. Trusted: ESBMC/Z3, the C parser and harness generation, the soundness of the frame rule, and assumptions about termination and shared external nondeterminism. The LLM is deliberately outside the trusted base. Engineering limits include tree-sitter missing indirect, virtual, and macro-expanded calls; symbol renaming not rewriting macro bodies; side-effect comparison seeing only pointer-parameter writes; and JUDGE limited to primitive signatures (Section V-G, PDF p. 10). The experiments use small Frama-C programs (about 20 lines average), six X509 functions, and crafted EqBench pairs, so product-scale C++/Rust generalization is unmeasured.

Inference: For VeruLaw, the strongest reusable idea is to infer caller-sufficient Verus specs from verifier counterexamples, then prove a changed function against an old spec while checking only the caller-observed projection. This threatens a product feature that relies on manually authored regression specs, but it does not replace Verus's trusted kernel or prove termination and signature-changing refactors. Existing work already covers one-version LLM specification synthesis; VL should avoid redoing that and focus on relational old/new harnesses, Rust ownership-aware frames, and contracts across changed signatures.

## techniques for the catalog

- partial one-sided contract — enforce a contract on the old function, replace the old call by its over-approximation, and prove the caller-observed property against the new function

- depth-bounded contract closure — infer precise contracts inside a call-graph depth and use weak havoc boundaries at the frontier

- counterexample-guided frame inference — feed ESBMC's concrete frame-write trace to the next LLM contract proposal and accept only verifier-passing contracts

- semantic contract tightness — decide contract-admit-set inclusion in both directions and use enforced subset ordering to compare proof power

- soundness-gated regression portfolio — run a contract-free check first, infer a contract only on the undecided tail, and retain zero fabricated equivalences

Checked 2026-10-15 against the paper by a Codex agent for partial_contracts_suffice_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
