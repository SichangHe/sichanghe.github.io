# Forte: A sensitivity type system for imperative Rust
(authored by agents unless marked 🧑)
Tag: `abuah2026forte`, [paper](http://arxiv.org/abs/2609.30254v1)

## problem and result

Forte is a sensitivity type system for mutable Rust programs used in differential privacy. Its central rule strongly updates a sensitivity environment through an exclusive `&mut` borrow, at primitive calls and checked function boundaries. The paper states: “We introduce Forte, a sensitivity type system for Rust whose soundness rests on ownership.” (abstract, p. 1). The system separates a sensitivity environment (one coefficient per source) from runtime payloads, and proves metric preservation over a store-based operational semantics.

The target gap is concrete. OpenDP mechanism kernels mutate through borrows, while earlier sensitivity calculi are pure or have no references. OpenDP has 109 hand-written proof documents covering 14 of 68 trusted stability closures in transformation constructors (p. 2). Forte realizes the calculus as `forte-rs`, checked by Flux without a compiler fork; Verus proves every deterministic primitive signature and the core theorem. In five OpenDP kernel families, 64 functions check in 0.41 s, 43 leaf theorems in 0.68 s, and the 46-item calculus in 1.31 s (Table 4, p. 15; Apple M4, 32 GB, Flux a166721, z3 5.1, Verus 0.2026.08.23). These are checking times, not proof-completeness percentages.

## technique 1: sensitivity environments and strong updates

What it is. Attach each sensitive value an environment vector `s` whose coordinates bound output movement for each source metric. Assignment and a mutating call replace the environment of the affected local; this is a strong update. The paper says, “The checker checks the body once against this signature, with acc standing for whichever local a caller borrows” (overview, p. 4).

How to apply it. (1) Declare source metrics and a finite environment width. (2) Give sensitive scalars or vectors refinement indices, such as `SInt[(hi-lo)*s.sa, ...]`. (3) Specify primitive signatures with `&mut` parameters and `ensures` post-environments. (4) At a call, require borrowed locals to be pairwise distinct, instantiate the signature at actual environments, and replace each borrowed local’s type with its output type. (5) Let SMT discharge pointwise environment inequalities. The paper’s bounded-sum example uses `#[spec(fn(data: &SVec[@s], lo: i64, hi: i64{lo <= hi}) -> SInt[(hi-lo)*s.sa, ...])]` and rejects a one-sensitivity claim for a clamped sum (p. 4).

Verus form. Inference: In Verus, represent the environment and store as ghost/spec state, use `requires` for `lo <= hi` and distinct ownership preconditions, and `ensures` to state the updated coefficient. Mutable Rust code remains ordinary code; a proof function establishes the primitive’s two-run metric lemma. Do not use the paper’s `#[spec]` syntax as if it were Verus syntax.

Evidence and limits. The formal theorem is Theorem 4.2, metric preservation over two related stores. The arithmetic model assumes unbounded integers and exact reals; overflow and floating-point rounding are outside the guarantee (p. 2). Inference: A VL implementation must make overflow and numeric conversion obligations explicit instead of inheriting this idealization.

## technique 2: exclusive-borrow framing and function boundaries

What it is. Exclusivity of `&mut` licenses a frame: a mutating call writes only borrowed locations, so unrelated sensitivity claims remain unchanged. At a checked function boundary, a callee is verified once under a signature scheme and instantiated at caller environments.

How to apply it. (1) Define a function signature whose borrowed arguments have output environments, for example `acc: &mut SInt[@av] ensures acc: SInt[av.a + (hi-lo)*s.sa, ...]` (p. 4). (2) Verify the body against that signature. (3) At each caller, borrow distinct locals and apply the post-environment. (4) For function calls, substitute caller locals for callee borrowed parameters; require the substitution to be injective. (5) Preserve all non-borrowed locals by the frame lemma.

The necessity is demonstrated by an aliased `double_into(&mut acc, &mut acc)` call. The paper says, “The exclusivity of &mut licenses treating each claim as a claim about a distinct location” (p. 5). It constructs a function whose second parameter is declared unchanged; aliasing then leaves a stale claim and permits a false sensitivity result. Rust’s borrow checker rejects the call before Flux runs.

Verus form. Inference: Model the frame as a `forall` property over untouched map keys and prove distinct mutable references through Rust’s ownership discipline. Use `ensures` on the verified function and a lemma for the disjoint-update condition. The paper’s key trusted fact is exclusivity; Verus cannot prove an unsafe aliasing violation unless the unsafe boundary is separately specified.

## technique 3: loop invariants inferred from sensitivity arithmetic

What it is. Loops carry an invariant environment. Flux infers invariants coupling the accumulator’s sensitivity to a public counter. The example specifies `v.a <= 100 * n` when `hi - lo <= 100` and repeatedly calls `add_clamped_sum` (pp. 5–6).

How to apply it. (1) Make the guard and index public. (2) Give the accumulator an initial environment. (3) Ensure one iteration’s primitive postcondition adds the per-item sensitivity. (4) State or expose a signature bound relating the accumulator to the loop counter. (5) Check initialization, preservation, and exit; Flux infers the invariant when its qualifier shape is available. A b-ary tree is the one case requiring two qualifier hints; all other case-study loops need no hints (p. 13).

The paper also checks writes at public vector indices: both related runs update the same slot, so the L1 environment grows predictably. Data-dependent indices are outside the checked fragment (p. 6). Inference: In Verus, write `invariant` clauses on the `while` loop and prove counter monotonicity and map update lemmas explicitly; inference is ours because the paper uses Flux syntax and reports Verus for the calculus and leaf theorems, not loop checking.

## technique 4: store-based relational soundness

What it is. Define related source stores by metric distances, related values by environment bounds, and related local stores by typing contexts. Theorem 4.2 proves that a well-typed terminating run has a related result and related post-store in a second run.

How to apply it. (1) Define source relation `ς1 ~d ς2`. (2) Define value and store relations for each sensitive type and metric. (3) Prove leaf validity for every trusted primitive signature. (4) Prove frame, strong-update, renaming, and function-call lemmas. (5) Induct over the first evaluation derivation; public guards force the second run to follow the same branch and terminate.

The paper states, “The theorem’s conclusion includes the second run’s termination.” (section 4, p. 10). It also says, “Lemma 4.3 is the single seam between the type system and primitive behavior, and a machine-checked theorem discharges every non-definitional case” (p. 10). Verus mechanizes the scalar calculus, Theorem 4.2, the function rule, and the aliased-call refutation in 46 verified items (p. 11).

Verus form. Inference: Encode relations as `spec fn`s over two stores, use `requires` for related inputs and typed contexts, and `ensures` for related outputs plus termination-relevant postconditions. Prove frame and strong-update lemmas with `forall` map extensionality and `assert` steps. This is a relational proof, not a unary postcondition; Verus constructs here are inferred from the paper’s described mechanization.

## technique 5: trusted signatures backed by Verus leaf theorems

What it is. `forte-rs` uses opaque structs with Flux refinement indices. Each trusted primitive signature names a Verus theorem proving its two-run validity. Table 2 includes add, clamp, bounded vector sum, histogram, prefix counts, chunk sums, and indexed addition.

How to apply it. (1) Implement a short deterministic primitive. (2) State its Flux signature and sensitivity postcondition. (3) Prove the corresponding two-run theorem in Verus. (4) Link the theorem in the signature documentation. (5) Let the calculus consume only the theorem statement. The development has 43 verified theorems and supporting lemmas, one-to-one with trusted signatures (p. 13).

The trusted base still includes Verus, Flux, rustc, the fixpoint engine, SMT, source declarations, metrics, and inspection of 313 non-comment library lines. The paper warns that one budget token per run is a protocol the checker does not enforce (p. 14). Inference: VL should keep this seam explicit: an `external_body` primitive without a separately proved relational lemma would enlarge the trusted base and defeat Forte’s design.

## evaluation and failures

The case study reimplements five OpenDP families with 131 kernel lines, 23 specification lines, 15 signatures, and two hints (Table 4, p. 15). It rejects off-by-one diameters, tightened bounds, under-calibrated releases, overspent budgets, and unbounded sums lacking a rule. It certifies 54 constructors that lack OpenDP proof documents (p. 3). Agreement with OpenDP constants requires converting symmetric distance, where one substitution costs two; the paper explicitly compares this denominator and metric convention in Table 3.

The paper’s threat model assumes an honest but fallible mechanism author and excludes malicious authors, sensitive control flow, stored references, long-lived borrows, closures over sensitive data, and probabilistic release details beyond affine budget discipline (p. 2, section 3). Inference: Threat to agent-written verified Rust is high when metrics, source declarations, or trusted signatures are wrong, but lower for covered deterministic kernels because Verus proves the leaf relation and Flux checks composition. Existing work already supplies ownership-based strong updates, relational metric preservation, and a concrete Rust/Flux implementation; VL should not redo an unscoped sensitivity calculus.

## techniques for the catalog

- sensitivity environments: attach per-source metric bounds to opaque Rust values and update them flow-sensitively
- exclusive-borrow strong updates: use pairwise-distinct `&mut` borrows and post-signatures to frame mutation safely
- relational metric preservation: prove two-run store/value relatedness by induction over evaluation
- inferred loop invariants: couple sensitivity bounds to public counters and expose qualifier hints only when inference needs them
- verified trusted signatures: back every deterministic primitive’s refinement contract with a Verus two-run theorem
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
