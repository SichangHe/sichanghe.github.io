# A Rust-to-Lean Verification Pipeline with AI Provers: An Experience Report
(authored by agents unless marked 🧑)
Tag: `klaus2026rust`, [paper](http://arxiv.org/abs/2605.30106v2)

## scope and results

Klaus, Conejero, and Tolmach describe a pipeline that translates production Rust cryptographic code into Lean 4, states a mathematical specification, obtains proofs manually or with Aristotle/Aleph, and has the Lean kernel re-check every proof. The abstract names the three components: “symbolic extraction tools (Charon and Aeneas, or Hax) that lift Rust into Lean 4”; “formal cryptographic specification libraries (ArkLib and CompPoly, from the Verified zkEVM project)”; and “AI provers (Aristotle from Harmonic AI and Aleph from Logical Intelligence) that close the resulting proof obligations” (abstract, p.1). The paper applies this to eight targets in Plonky3 and RISC Zero: FRI round scheduling, arity-2 FRI folding, Mersenne31 and KoalaBear arithmetic, Horner evaluation, one-step FRI folding, Merkle inclusion, and a 32-bit ADC (sec.6, Table 1, p.9).

The strongest end-to-end result is fold_step: under explicit bounds, Lean proves that the extracted Rust arithmetic neither overflows nor leaves `[0,p)`, and equals ArkLib's `foldNth 2 f β` evaluation (sec.6, p.9). For `compute_log_arity_for_round`, six bounds/boundary theorems were stated; Aleph closed two, `arity_respects_max_bound` and `arity_respects_target_distance`, in PRs #1 and #3 (secs.4.1–4.2, pp.6–8). Four remained `sorry` in the public repository (sec.6, p.10). This is a small empirical sample: “two theorems that Aleph closed (PR #1 and PR #3), plus informal experiments on neighbouring lemmas” (sec.5, p.8).

## technique: extract safe Rust into pure Lean

What it is: Charon lowers safe Rust MIR-derived LLBC, and Aeneas translates LLBC into pure functional Lean. Hax instead consumes Rust compiler THIR and lowers annotated items to Lean (or other backends). Aeneas represents each function in a `Result α`-style monad with `ok`, `fail`, and `div`; Hax uses `RustM` with explicit success, failure, and divergence paths (secs.2.1–2.2, pp.3–4).

When to use it: use this route for safe Rust whose operations and control flow lie in the extractors' supported subsets. The authors kept Hax work to “the fragment of pure, bounded-loop functions where Hax’s translation is reliable” (sec.2.2, p.3).

How to do it:

1. For Aeneas, run Charon on the Cargo crate to produce LLBC, then Aeneas to produce `Types.lean` and `Funs.lean` (sec.3, p.4)
2. For Hax, annotate Rust items with `#[hax::contract]` and related attributes, then run `cargo hax into lean` (sec.3, p.4)
3. Treat Rust loops as recursive Lean functions and discharge termination obligations (sec.3, p.4; sec.7, p.11)
4. Keep checked arithmetic's overflow and panic branches explicit in the monad (sec.3, p.4)

Verus form: Inference: Verus does not use this extraction pipeline. A Verus implementation remains executable Rust with contracts and proof functions in the same source. The closest reusable idea is to expose checked arithmetic and failure conditions in a contract, rather than translating the whole function. A Verus contract can use `requires`/`ensures` and `assert`, but the paper gives no Verus encoding for `Result`/`RustM` extraction.

Evidence and limits: extraction removes memory reasoning only in Aeneas's model because it treats borrow-checker guarantees as semantic input (sec.2.1, p.3). Generic trait-bounded functions cannot be extracted directly; the authors monomorphised them. Calls into external crates such as `byteorder` and `std::io::Read/Write` were not extractable because Charon cannot see MIR outside the workspace (sec.7, p.11). Unsafe Rust is outside the described pipeline; the paper suggests layering another tool for unsafe portions (sec.7, p.11).

Quote: “The supported subset of safe Rust that Aeneas and Hax can extract to pure Lean is finite.” (sec.7, p.11)

## technique: state a concrete or library-linked specification

What it is: write a pure mathematical function over `N`, `Z/pZ`, or a library abstraction, then state that the extracted Rust result equals it under explicit preconditions. Simple targets use handwritten specs; matching targets import ArkLib or CompPoly definitions (sec.3, p.4).

When to use it: use a handwritten spec for a small arithmetic routine; use ArkLib/CompPoly when verifying a cryptographic primitive whose intended meaning already exists in those libraries. The fold example equates Rust's output to `foldNth 2 f β` evaluated at `x²` (sec.6, p.9).

How to do it:

1. Choose the mathematical domain and write the pure reference function (sec.3, p.4)
2. State input preconditions, such as `p² ≤ 2⁶⁴−1` and all inputs being below `p` (sec.3, p.4; sec.6, p.9)
3. State a theorem that the extracted function returns the reference value (sec.3, p.4)
4. Add separate bounds theorems for no-overflow and output range; fold_step proves all 13 checked operations safe and final output in `[0,p)` (sec.6, p.9)
5. For library-linked targets, import the ArkLib/CompPoly definition and prove equivalence in Lean (sec.3, p.4)

Verus form: Inference: encode the reference as a `spec fn`, put input assumptions in `requires`, and state equality or range in `ensures`. Keep executable Rust separate from the specification expression; unlike Lean's extracted monad, Verus proof code is erased and executable code remains Rust. The paper's algebraic `ring` step has no direct Verus guarantee in this study; equivalent algebra may need explicit lemmas or nonlinear arithmetic.

Evidence and limits: fold_step's equivalence is the paper's tightest implementation-to-spec result (sec.6, p.9). The property is only as meaningful as the specification and preconditions. Inference: a wrong ArkLib definition or an omitted precondition can yield a sound proof of the wrong requirement. The paper does not report a whole-system proof; it verifies selected critical primitives.

Quote: “The main theorem of each verification target then states: under the precondition structure, the extracted Rust function returns a value matching the specification.” (sec.3, p.4)

## technique: combine structural tactics with AI proof search

What it is: construct proofs manually or ask Aristotle/Aleph to close individual lemmas or complete theorems. Available Lean automation includes Aeneas `progress` and `scalar_tac`, plus `omega`, `nlinarith`, `ring`, `simp`, and `decide` (sec.3, p.4). AI output is ordinary Lean proof text and is kernel-checked.

When to use it: the authors report reliable success on monad inversions, conditional bounds, enum case splits, mild linear arithmetic, and simp-normalisable extracted code; they report manual work for domain-specific algebra, loop invariants, and axiomatizing external interfaces (sec.5, pp.8–9).

How to do it:

1. Extract the function and formulate the target theorem (secs.3–4)
2. Run Aeneas tactics to progress through monadic `let` bindings and discharge arithmetic side conditions (sec.3, p.4)
3. Invoke an AI prover on an individual lemma or theorem (sec.3, p.4)
4. If search stalls, expose the needed arithmetic or algebraic hypothesis, choose Mathlib lemmas, or write the proof manually (sec.5, p.9)
5. Run Lean's kernel re-check; the trust boundary accepts only typechecking proofs (sec.3, p.5)

Verus form: Inference: use `assert`, `assert forall|...|`, `reveal`, and proof functions with `ensures` for intermediate facts, then let Verus's SMT backend discharge arithmetic. Verus has no direct analogue of Lean's `simp`/`ring` tactic names guaranteed by this paper; the exact proof script must follow the available Verus library.

Evidence and limits: the two Aleph PRs closed two nontrivial structural bounds theorems (secs.4.1–4.2, pp.6–8). Aleph produced reusable helper lemmas, but the remaining four theorems were still `sorry` (sec.6, p.10). “Specification design, invariant discovery, and the selection of mathematical abstractions remained the work of human proof engineers” (sec.5, p.9). Inference: this is an assistive workflow, not autonomous verification of arbitrary Rust.

Quote: “Manual and AI-driven proofs coexist in the same Lean file.” (sec.3, p.5)

## technique: prove checked-control-flow bounds with helper lemmas

What it is: for Hax's `compute_log_arity_for_round`, decompose a monadic computation into reusable inversion and conditional-bound lemmas, then compose them in the main theorem (secs.4.1–4.2, pp.6–8).

When to use it: use this shape when extracted code consists of monadic checked operations, `Option` branches, and `if`-based minimum/cap selections.

How to do it:

1. Prove `RustM_bind_eq_ok`: a successful bind implies an intermediate `ok a` and successful continuation (sec.4.1, p.6)
2. Prove a right-bound helper: `(if decide (a < b) then ok a else ok b) = ok r` implies `r ≤ b` (sec.4.1, p.6)
3. Unfold the target function, peel checked subtraction binds, split on `Option`, and split on the inner comparison (sec.4.1, p.6)
4. Apply the right-bound helper to obtain the cap bound; note that the maximum-bound theorem does not need the arithmetic precondition (sec.4.1, p.6)
5. For target-distance, use the symmetric left-bound helper, derive `log_final_height < log_current_height` from `h_gt`, simplify checked subtraction, and convert `USize64` order to `Nat` order (sec.4.2, pp.7–8)

Verus form: Inference: represent the cap computation as ordinary Rust plus a `requires` precondition for non-underflow. Use small `proof fn`s with `ensures` for bind/conditional monotonicity, then split with `if` branches and `assert` the selected operand's bound. Do not write `invariant(...)` as a call; loop invariants belong on loops in Verus syntax, and this example has no loop.

Evidence: the paper prints the complete helper and main-theorem Lean proof shapes (secs.4.1–4.2, pp.6–8). The target-distance proof explicitly uses `USize64.toNat_sub_of_le'` after establishing the strict height inequality (sec.4.2, p.8). The result is two merged Aleph PRs, but four sibling obligations remained open (sec.6, p.10).

Quote: “Both PRs are notable for how Aleph closed the theorems: by identifying and proving small reusable helper lemmas, then composing them in a structurally clean main proof.” (sec.4.2, p.8)

## technique: repair extraction gaps by upstream fixes or models

What it is: when extraction fails, first contribute a missing lemma/feature upstream; otherwise rewrite the mathematical core as a monomorphic extraction-friendly model. The authors list a third, layered approach for unsafe code (sec.7, pp.11–12).

How to do it:

1. Fix a missing upstream feature, as with the `BitVec.toNat_pow` collision (sec.7, p.11)
2. If generic traits, parallel iterators, or external crates block extraction, write a standalone non-generic Rust model (sec.7, p.11)
3. Verify the model end-to-end and establish its semantic equivalence to production code; the fold_matrix-to-`u64` fold_step rewrite is the example (sec.7, p.11)
4. For unsafe code, verify the safe core with Aeneas/Hax and layer a complementary tool for unsafe blocks (sec.7, p.11)

Verus form: Inference: the analogous Verus practice is to isolate unsupported code behind a reviewed specification boundary, then prove a supported model and a refinement relation to the production implementation. A model proof alone does not establish equivalence unless that relation is proved.

Evidence and limits: toolchain drift required alignment on Lean 4.26.0 for Hax and 4.28.0 for Aeneas (sec.7, p.11). `u128` casts needed `nlinarith` after `progress`; generic trait bounds required monomorphisation; external-crate calls remained unextractable (sec.7, p.11). These constraints can leave trusted gaps between model and production.

## trust, what is measured, and product implication

The Lean kernel re-checks every emitted proof; this is the explicit trust boundary (sec.3, p.5). The paper proves selected functional properties, bounds, arithmetic equivalences, and cryptographic primitive correspondences. It does not prove that specifications capture protocol intent, that an extraction model equals all production behavior when rewriting is used, or that unsupported unsafe/external code is correct. Inference: the Rust compiler, extractor semantics, Lean kernel implementation, imported libraries, and any axioms for external interfaces remain dependencies of the result; AI is not trusted to be sound because its proof must typecheck.

Inference: for agent-written verified Rust, this pipeline is a high threat reduction for small safe cryptographic kernels when a stable reference specification exists, but a substantial residual threat remains in specification design, unsupported language features, model-to-production equivalence, loop invariants, and open obligations. The paper's own evidence is eight selected targets and two AI-closed theorems, not a success rate for arbitrary agent code. The reported numbers have no conflicting denominators: eight targets are in Table 1, six theorems are stated for round scheduling, two are AI-closed, and four remain open (secs.4–6, pp.6–10).

## techniques for the catalog

- safe-Rust extraction — translate Charon/LLBC or Hax/THIR into pure Lean with explicit monadic failure and termination obligations
- reference specifications — state handwritten or ArkLib/CompPoly mathematical behavior under explicit preconditions
- kernel-checked AI proving — combine Aeneas/Lean tactics, manual lemmas, and Aristotle/Aleph, then let Lean re-check every proof
- monadic bound decomposition — prove bind inversion and conditional-bound helpers before composing extracted-control-flow theorems
- extraction-gap repair — fix tools upstream or verify a monomorphic extraction-friendly model, with a separate relation to production
- layered unsafe verification — verify the safe core with extraction and use complementary tooling for unsafe Rust
