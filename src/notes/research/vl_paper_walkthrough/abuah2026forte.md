# Forte: A sensitivity type system for imperative Rust
(authored by agents unless marked 🧑)
Tag: `abuah2026forte`, [paper](http://arxiv.org/abs/2609.30254v1)

## problem and result

Forte is a sensitivity type system for mutable Rust programs used in differential privacy. Its central rule strongly updates a sensitivity environment through an exclusive `&mut` borrow, at primitive calls and checked function boundaries. The paper states: “We introduce Forte, a sensitivity type system for Rust whose soundness rests on ownership.” (abstract, p. 1). The system separates a sensitivity environment (one coefficient per source) from runtime payloads, and proves metric preservation over a store-based operational semantics.

The target gap is concrete. OpenDP mechanism kernels mutate through borrows, while earlier sensitivity calculi are pure or have no references. OpenDP has 109 hand-written proof documents covering 14 of 68 trusted stability closures in transformation constructors (p. 2). Forte realizes the calculus as `forte-rs`, checked by Flux without a compiler fork; Verus proves every non-definitional deterministic primitive obligation and the scalar core theorem. The evaluation reimplements five OpenDP transformation families. The whole crate’s 64 functions check in 0.41 s, the 43 leaf theorems and supporting lemmas in 0.68 s, and the 46-item scalar calculus development in 1.31 s (Table 4, p. 15; Apple M4, 32 GB, Flux a166721, z3 5.1, Verus 0.2026.08.23). These are checking times, not proof-completeness percentages.

## technique 1: sensitivity environments and strong updates

What it is. Attach each sensitive value an environment vector `s` whose coordinates bound output movement for each source metric. Assignment and a mutating call replace the environment of the affected local; this is a strong update. The paper says, “The signature has an ensures clause: the borrowed accumulator leaves the call with an environment computed from the environment it arrived with.” (overview, p. 4).

How to apply it. (1) Declare source metrics and a finite environment width. (2) Give sensitive scalars or vectors refinement indices with one coefficient per source. (3) Specify primitive signatures with `&mut` parameters and `ensures` post-environments. (4) At a call, require borrowed locals to be pairwise distinct, instantiate the signature at actual environments, and replace each borrowed local’s type with its output type. (5) Let SMT discharge pointwise environment inequalities. The paper’s bounded-sum example multiplies each input coefficient by `hi-lo` and rejects a one-sensitivity claim for a clamped sum (p. 4).

Verus form. Inference: In Verus, represent the environment and store as ghost/spec state, use `requires` for `lo <= hi` and distinct ownership preconditions, and `ensures` to state the updated coefficient. Mutable Rust code remains ordinary code; a proof function establishes the primitive’s two-run metric lemma. Do not use the paper’s `#[spec]` syntax as if it were Verus syntax.

Evidence and limits. The formal theorem is Theorem 4.2, metric preservation over two related stores. The arithmetic model assumes unbounded integers and exact reals; overflow and floating-point rounding are outside the guarantee (p. 2).

## technique 2: exclusive-borrow framing and function boundaries

What it is. Exclusivity of `&mut` licenses a frame: a mutating call writes only borrowed locations, so unrelated sensitivity claims remain unchanged. At a checked function boundary, a callee is verified once under a signature scheme and instantiated at caller environments.

How to apply it. (1) Define a function signature whose borrowed arguments have output environments, for example the accumulator’s incoming environment plus the dataset’s environment scaled by `hi-lo` (p. 4). (2) Verify the body against that signature. (3) At each caller, borrow distinct locals and apply the post-environment. (4) For function calls, substitute caller locals for callee borrowed parameters; require the substitution to be injective. (5) Preserve all non-borrowed locals by the frame lemma.

The necessity is demonstrated by an aliased `double_into(&mut acc, &mut acc)` call. The paper says, “The exclusivity of &mut licenses treating each claim as a claim about a distinct location, and §4 makes this premise the content of the soundness theorem.” (p. 5). It constructs a function whose second parameter is declared unchanged; aliasing then leaves a stale claim and permits a false sensitivity result. Rust’s borrow checker rejects the call before Flux runs.

Verus form. Inference: Model the frame as a `forall` property over untouched map keys and prove distinct mutable references through Rust’s ownership discipline. Use `ensures` on the verified function and a lemma for the disjoint-update condition.

## technique 3: loop invariants inferred from sensitivity arithmetic

What it is. Loops carry an invariant environment. Flux infers invariants coupling the accumulator’s sensitivity to a public counter. The example specifies `v.a <= 100 * n` when `hi - lo <= 100` and repeatedly calls `add_clamped_sum` (pp. 5–6).

How to apply it. (1) Make the guard and index public. (2) Give the accumulator an initial environment. (3) Ensure one iteration’s primitive postcondition adds the per-item sensitivity. (4) State or expose a signature bound relating the accumulator to the loop counter. (5) Check initialization, preservation, and exit; Flux infers the invariant when its qualifier shape is available. A b-ary tree is the one case requiring two qualifier hints; all other case-study loops need no hints (p. 13).

The paper also checks writes at public vector indices: both related runs update the same slot, so the L1 environment grows predictably. Data-dependent index mutation is confined to leaf primitives (pp. 6, 17). Public-index element writes are checked by the implementation; extending the calculus and its mechanization to cover them is future work (p. 24). Inference: In Verus, write `invariant` clauses on the `while` loop and prove the needed arithmetic and update lemmas explicitly. Flux’s inferred invariants do not establish that Verus infers them; the Verus executable-loop example supplies invariants (§7, p. 18).

## technique 4: store-based relational soundness

What it is. Define related source stores by metric distances, related values by environment bounds, and related local stores by typing contexts. Theorem 4.2 proves that a well-typed terminating run has a related result and related post-store in a second run.

How to apply it. (1) Define source relation `ς1 ~d ς2`. (2) Define value and store relations for each sensitive type and metric. (3) Prove leaf validity for every trusted primitive signature. (4) Prove frame, strong-update, renaming, and function-call lemmas. (5) Induct over the first evaluation derivation; public guards force the second run to follow the same branch and terminate.

The paper states, “The theorem’s conclusion includes the second run’s termination.” (section 4, p. 10). It also says, “Lemma 4.3 is the single seam between the type system and primitive behavior, and a machine-checked theorem discharges every non-definitional case (§5).” (p. 10). Verus mechanizes the scalar calculus, Theorem 4.2, the function rule, and the aliased-call refutation in 46 verified items. Its procedures have monomorphic signatures, only borrowed parameters, and bodies mentioning only those parameters; vectors, environment-polymorphic schemes, by-value parameters, and fresh callee locals require the separate leaf development or paper proofs (p. 11).

Verus form. Inference: Encode relations as `spec fn`s over two stores, use `requires` for related inputs and typed contexts, and `ensures` for related outputs plus termination-relevant postconditions. Prove frame and strong-update lemmas with `forall` map extensionality and `assert` steps. This is a relational proof, not a unary postcondition; Verus constructs here are inferred from the paper’s described mechanization.

## technique 5: trusted signatures backed by Verus leaf theorems

What it is. `forte-rs` uses opaque structs with Flux refinement indices. Each trusted signature with a non-definitional deterministic two-run obligation names a Verus theorem proving it; constants, source reads, duplication, sized length, and exact release of insensitive values are definitional (Appendix C, p. 29). Table 2 includes add, clamp, bounded vector sum, histogram, prefix counts, chunk sums, and indexed addition.

How to apply it. (1) Implement a short deterministic primitive. (2) State its Flux signature and sensitivity postcondition. (3) Prove the corresponding two-run theorem in Verus. (4) Link the theorem in the signature documentation. (5) Let the calculus consume only the theorem statement. The development has 43 verified theorems and supporting lemmas in total (p. 13). Table 2 maps signature families to named leaf theorems; it does not count 43 distinct primitive signatures.

The trusted base still includes Verus and its solver, Flux, rustc, the fixpoint engine, SMT, source declarations and metrics, raw-data injection, and inspection that 313 non-comment library lines implement the modeled primitives (p. 14). Theorem 5.1 transports metric preservation only for fragment F under a model of the checker with four assumed properties; deriving those properties from Flux’s core calculus is future work (p. 12).

## evaluation and failures

The case study reimplements five OpenDP families with 131 kernel lines, 23 specification lines, 15 signatures, and two hints (Table 4, p. 15). Its negative controls reject off-by-one diameters, tightened bounds, under-calibrated releases, and under-provisioned budget splits. An aliased mutable-borrow call fails in rustc; an unclamped substitution-metric sum has no typing rule (p. 16). The repository survey finds 54 of 68 trusted stability closures without proof documents, including all bounded-sum variants and the b-ary tree; this is the surveyed surface, not a count of evaluated constructors (p. 16). Agreement with OpenDP constants requires converting symmetric distance, where one substitution costs two; the paper explicitly compares this denominator and metric convention in Table 3.

The paper’s threat model assumes an honest but fallible mechanism author and excludes malicious authors (p. 2). The calculus excludes sensitive control flow, stored references, borrows outliving a call, and closures over sensitive data (§3, p. 6). Section 7 proves release-calibration and composition arithmetic in 14 verified items, while trusting the sampler’s distribution and monotonicity of `exp` (p. 22). The paper states, “The budget tokens make splitting and spending affine, but nothing prevents a program from minting a second token, so one mint per program run is a protocol the checker does not enforce.” (p. 14).

## techniques for the catalog

- sensitivity environments: attach per-source metric bounds to opaque Rust values and update them flow-sensitively
- exclusive-borrow strong updates: use pairwise-distinct `&mut` borrows and post-signatures to frame mutation safely
- relational metric preservation: prove two-run store/value relatedness by induction over evaluation
- inferred loop invariants: couple sensitivity bounds to public counters and expose qualifier hints only when inference needs them
- verified trusted signatures: back each non-definitional deterministic sensitivity contract with a Verus two-run theorem
