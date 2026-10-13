# Scaling Verification of Cryptographic Software with Aeneas, Rust, and Lean
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and trust boundary

Ho et al. present a production-oriented method: write cryptographic Rust, extract it with Charon and Aeneas into pure Lean, and prove functional correctness and panic-freedom against independently formalized NIST/IETF standards. The case study covers SymCrypt and reports 16.7 KLOC of verified Rust supported by 237,160 lines of Lean. The authors state the boundary plainly: “Our formal theorems establish functional correctness and panic-freedom for the Rust code, against the formalized standards.” They trust the standard formalization, public API theorems, Rust compiler and target backends, Charon/Aeneas translation, Lean kernel, native_decide/bv_decide, and axiomatized intrinsics. They do not trust AI-produced proof text because Lean checks every proof. Side-channel leakage is out of scope; constant-time style is tested separately.

## technique 1: extract ownership-safe Rust to pure Lean

what and when. Charon extracts rustc MIR to LLBC; Aeneas translates LLBC to pure, side-effect-free Lean. Rust ownership and borrowing eliminate pointer liveness and aliasing from the model. Use this for stateful safe Rust where proving the source directly would expose memory machinery. (For the standards side, §4 says: “We strive to syntactically align specifications and standards”. That sentence is about the Lean specification, not about extraction.)

how. Compile each target with rustc; extract MIR; translate every mutable or shared borrow into an explicit value result; represent mutation by returned values and `Result` failures. For a Barrett reduction, Rust `fn reduce(x:&mut u64)` becomes a Lean monadic function returning `Result U64`, with each potentially overflowing multiplication, shift, and subtraction bound to its own `do` step. A theorem states the precondition `x.val < 2 * Q.val` and monadic postcondition `r.val = x.val % Q.val`.

verus form (inference). Verus keeps Rust source and verifies ownership directly, so this extraction is not required. The transferable idea is to make borrow-related state explicit in ghost values and use `requires`/`ensures` for panic and arithmetic conditions. Aeneas has limited support for unsafe Rust and does not support raw pointers, interior mutability, or concurrency (§5.1); Verus likewise needs separate models or assumptions for such code.

## technique 2: step tactics for monadic proof obligations

The custom `step`, `step*`, and `step*?` tactics advance one or many monadic operations, prove preconditions with `grind`, and expose intermediate equations. The paper's example marks a reusable theorem `@[step] theorem reduce.spec ... := by unfold reduce; step* <;> scalar_tac`. The tactic leaves overflow, underflow, and postcondition goals, then `scalar_tac` closes them. `step*?` expands a proof for inspection. Fail-fast, curated `grind` lemmas and low case-split/generation limits keep proof search responsive. In §7.2, on ML-KEM rejection sampling, the authors state: “Aeneas allows proving partial correctness”, meaning the sampler either loops or terminates with a correct output; this is why technique 6 proves termination separately.

verus form (inference). Use small `assert` steps after each arithmetic operation, with explicit bounds and cast lemmas. Package a proved function contract as a reusable lemma so callers need not unfold implementation details. This mirrors `@[step]` without importing Lean tactics.

## technique 3: reshape extracted code, not production code

The `decompose` command folds selected ranges of a large extracted function into auxiliary calls and proves an equality theorem for the rewrite. For two inlined reductions, `#decompose compute compute_eq letRange 0 4 => reduce` creates `compute_eq`; the proof then rewrites with `rw [compute_eq]` and applies `step*`. The command is outside the trusted computing base because the resulting equality is kernel-checked. Agents are instructed to decompose functions above a monadic-step threshold or when a monolithic proof is too complex.

verus form (inference). Extract helper functions or lemmas at stable Rust boundaries when useful, but preserve production behavior. In proof-only code, prove an equivalence lemma between the original and factored form; then use the helper contract. Avoid changing executable code solely to satisfy a prover unless performance and review justify it.

## technique 4: domain-specific arithmetic, arrays, and bitvectors

Lean automation adds `simp_scalar` and `simp_lists` for conditional arithmetic and list updates, conversion tactics between machine integers, naturals, integers, modular values, and bitvectors, and `bv_tac` that lifts context before `bv_decide`. These tactics target extracted Rust's combination of arrays, nonlinear arithmetic, and bitwise operations. Inference: use mathematical arithmetic for value reasoning and bitvectors for truncation, wrapping, and lane layout.

## technique 5: model intrinsics and multi-target code

For each architecture, Charon extracts once and merges LLBC ASTs, deduplicating common code and turning target-specialized branches into dynamic ones. Intrinsics are redirected under a verify-only feature to Rust shims over fixed-size lane arrays, transcribed from vendor pseudocode. A simple intrinsic has an ordinary model and theorem; an AES round may use an axiom tied to the formal AES specification. CPU feature presence is modeled as an opaque function and required as a precondition of every function that may use the feature (§6). This keeps production builds free of verification shims while proving safety of feature-gated paths.

## technique 6: stateful APIs, ghost histories, and termination

To relate SymCrypt's incremental SHAKE API to one-shot FIPS specifications, add ghost byte histories. Predicates `absorbing` and `squeezing` connect runtime state to bytes consumed and emitted. This exposed a real extract bug: a lane copy restarted at offset zero after a partial lane, overwriting output. The proof agent drafted a report; differential testing independently found it. For ML-KEM rejection sampling, prove termination at specification level by proving Keccak is a permutation on its finite state space and deriving a bound; then prove the implementation terminates.

## evidence, contradictions, and VL relevance

The project verifies SHA-3, ML-KEM, AES/GCM, and experimental ML-DSA, FrodoKEM, and HPKE, with 16,680 Rust lines and 124,777 Lean proof lines in the reported table (the abstract separately says 16.7 KLOC and 237 KLOC total Lean including generated definitions). Agents produce proofs, but standards, intrinsics, and public theorem statements require human review. Bugs found include an NTT assertion fixed from `x < Q` to `x ≤ Q`, and a constant-time comparison shift fixed from `>> 8` to `>> 16`. These findings show that verified proofs can expose incorrect code and incorrect comments, but only relative to the formalized specification.

For VL, the key pattern is separating a small trusted semantic layer from large generated proofs, using ghost state for streaming APIs, and making unsupported intrinsics explicit axioms or reviewed models. The threat to agent-written verified Rust remains specification and axiom correctness: Lean cannot detect a standards transcription error, an incomplete public contract, or an unsound intrinsic model. The paper itself says: “Side channels are out of scope at the Rust level”. Experimental implementations are not claimed production-ready.

## techniques for the catalog

- Aeneas extraction: translate ownership-safe Rust MIR into pure Lean values and explicit failure results
- monadic step automation: advance extracted code one operation at a time while discharging preconditions and postconditions
- proof-only decomposition: fold large extracted functions with kernel-checked equality rewrites
- theory-specific tactics: combine scalar/list simplification, arithmetic-domain conversion, and bitvector decision procedures
- multi-target extraction: merge per-architecture MIR while preserving target-specific branches
- intrinsic shims and axioms: model vendor instructions over lane arrays or reviewed standard-linked axioms
- ghost streaming state: relate incremental runtime APIs to one-shot standards through absorbed and emitted histories
- specification-level termination: prove finite-state permutation or bound properties before lifting termination to code

Audited 2026-10-12 against the paper: read the study and the full paper text (pdftotext in reading order for the two-column layout); checked the 16.7 KLOC, 237,160, 16,680 and 124,777 figures against the abstract and Figure 4, the Barrett reduce example and theorem, the step and decompose descriptions, the multi-target and intrinsic-shim steps, the SHA-3 ghost-state bug, the termination argument, the NTT and FrodoKEM bugs, and the trust list. Changed: the Aeneas unsupported-feature statement (the paper says limited support for unsafe Rust); moved a quotation about specification alignment out of the extraction technique and said what it is about; gave the partial-correctness quotation its section and purpose; marked one unmarked inference; narrowed the feature-presence precondition to what section 6 says. Could not check: the Lean sources and the performance and agent-cost sections 8 and later, which the study does not use.
