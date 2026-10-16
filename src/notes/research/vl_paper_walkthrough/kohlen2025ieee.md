# A Formally Verified IEEE 754 Floating-Point Implementation of Interval Iteration for MDPs
(authored by agents unless marked 🧑)
Tag: `kohlen2025ieee`, [paper](https://doi.org/10.1007/978-3-031-98679-6_6)

## what the paper proves or measures

The paper verifies interval iteration (II), an algorithm for minimal and maximal reachability probabilities in finite Markov decision processes (MDPs), from abstract real-valued mathematics down to executable LLVM using IEEE 754 floating point and directed rounding. The abstract says: “Our correctness proofs span the entire development from the high-level abstract semantics of MDPs to a low-level implementation in LLVM that is based on floating-point arithmetic.” (Abstract, p.122). The development is in Isabelle/HOL and the Isabelle Refinement Framework (IRF), not Verus. It proves that exact-arithmetic II returns lower and upper bounds and converges, and that safe-rounded floating-point refinement preserves the bound property (Sections 3–4, pp.128–138).

An MDP has finite states and probabilistic actions. For a target set, `Pinf` and `Psup` are the infimum and supremum reachability probabilities over valid strategies. Bellman operators `Finf` and `Fsup` map a value vector to one-step minimal or maximal expected value (Section 2.4, pp.127–128). Standard value iteration can stop with arbitrarily wrong values; II instead maintains a lower and upper sequence and stops when their distance is below a user threshold. Exact convergence requires preprocessing and real arithmetic. Floating-point convergence to one fixed point is not proved, although experiments observe it (Sections 3.1 and 3.4, pp.129, 132–133; Section 4.5, p.138).

## technique 1: reduce the MDP before interval iteration

what it is: II is guaranteed to converge only when every maximal end component (MEC) is trivial or bottom. The paper formally defines min-reduction for `Pinf` and max-reduction for `Psup`, proves that each transformed MDP is reduced, and proves that reachability probabilities are preserved (Sections 3.2–3.3, pp.129–132).

how to do it:
1. identify strongly connected components, MECs, trivial MECs and bottom MECs in the finite MDP (Section 3.2, p.129)
2. for minimum reachability, map every non-trivial MEC except the target to an absorbing avoid state `s−`; define `red_inf s = s` for trivial states or target and `s−` otherwise, then apply `map_mdpc` and add a self-loop at `s−` (Definitions 3.3–3.4, p.130)
3. prove finite-horizon probabilities are preserved; Theorem 3.1 lifts this to infinite-horizon `Pinf` (p.130)
4. for maximum reachability, first collapse each MEC to one state, then map bottom MECs to the avoid state and remove irrelevant self-loops (Section 3.2, pp.130–131)
5. build a level graph from bottom MECs; show every state reaches a bottom MEC with probability tending to one (Definition 3.5 and Theorem 3.3, pp.131–132)

The level-graph proof uses `η`, the smallest transition probability, and `I`, the greatest level. The paper proves a finite-horizon lower bound `η^I` and then `1 − (1 − η^I)^n` for multiples of `I` (Lemma 3.3 and Theorem 3.3, p.132).

evidence: The preservation theorems are Isabelle-checked. The authors explicitly call their min-reduction “a substantial simplification compared to the pen-and-paper version” (Section 3.2, p.130). The transformation is a prerequisite for the later convergence theorem, rather than an independent runtime benchmark.

limits and assumptions: the formal reduction backend is not yet efficiently verified in the paper’s integration; Section 6 says reduced-MDP transformations remain to be completed. The MDP is finite and well-formed. Deterministic-policy limitations require a special argument for max-reduction (Section 3.2, p.131).

Verus form: Inference: represent states, actions and MEC membership with ghost sets and prove finite-set closure with `requires` and `ensures`; use loop invariants for graph exploration and state mapping. Verus can check preservation lemmas over finite sequences or maps, but it has no built-in Isabelle locale or nres monad; the abstract relation must be encoded as Rust specs and proof functions.

## technique 2: prove interval iteration sound and convergent over exact values

what it is: start with `lb0` assigning one to the target and zero elsewhere, and `ub0` assigning zero to the avoid state and one elsewhere. Apply the monotone Bellman operator to both sequences. Definition 3.1 is `lbinf n = Finf^n lb0` and `ubinf n = Finf^n ub0` (Section 3.1, p.129).

how to do it:
1. establish that `lb0 ≤ Pinf ≤ ub0`
2. prove Bellman monotonicity and preservation of lower and upper bounds (Lemma 3.1, p.129)
3. iterate both vectors; lower bounds increase and upper bounds decrease
4. use Lemma 3.4 to identify the sequences with finite-horizon reachability probabilities
5. combine the bottom-MEC probability bound with Lemma 3.4 to bound `ubinf − lbinf`; stop when the interval is below the selected ε (Section 3.4, pp.132–133)

The paper notes: “The idea of the II algorithm is to start with a lower and an upper bound on the true reachability probabilities and then iterate the Bellman optimality operator Finf (or Fsup ) on both.” (Section 3.1, p.129). The exact convergence theorem requires a reduced MDP whose only bottom MECs are absorbing target and avoid states. It excludes the deterministic case where all probabilities are one; qualitative methods are preferable there (Section 3.4, p.133).

evidence: Theorem 3.4 proves the interval-width bound with exact arithmetic (p.133). The algorithmic specification later states only soundness of returned bounds, because floating-point intervals can be farther apart than the real-valued intervals (Section 4.3, p.137).

Verus form: Inference: write `spec fn finf` over immutable maps, prove monotonicity as a lemma, and maintain loop invariants `lb[s] <= pinf[s]` and `pinf[s] <= ub[s]`. A Verus loop can establish each iteration’s bound preservation; convergence is a separate mathematical lemma over a ghost iteration counter and ε.

## technique 3: refine reals to safe IEEE 754 bounds

what it is: instead of estimating accumulated floating-point error, refine each real to a lower-bounding (lb) or upper-bounding (ub) float. Lower bounds round toward negative infinity and upper bounds toward positive infinity. The relation is `Rlb = {(fl,r). valof fl ≤ r ∧ ¬is_nan fl ∧ valof fl ≥ 0}` (Section 4.2, p.135). Restricting to non-negative values ensures multiplication preserves the bound; NaN is excluded because it is incomparable.

how to do it:
1. choose lower or upper bound representation and directed AVX512 rounding (Section 4, p.133)
2. define a refinement relation from real values to non-NaN, non-negative bounding floats (Section 4.2, p.135)
3. prove each required operation separately: fused multiply-add (`fma_avx_lb`), mixed comparison, subtraction, min/max, and constants (Sections 4.2, pp.135–136)
4. use a nondeterministic `spec` comparison: a false comparison must remain false, while a true comparison may return either result (Lemma 4.2, p.135)
5. instantiate II with Gauss–Seidel in-place updates and a finite iteration bound; prove it refines the abstract interval specification (Definitions 4.1–4.2 and Theorem 4.1, p.137)

The key operation proof says: “Fused Multiply-Add. The ternary operator fma a b c = a × b + c (fused multiply-add) yields a smaller floating-point rounding error compared to per-forming the two operations separately.” (Section 4.2, p.135). The transition probability is strictly positive, avoiding the `0f * ∞f` NaN case (p.135).

evidence: The final Hoare triple (Theorem 4.2, pp.138–139) states that, under finite well-formed MDP and 64-bit-size preconditions, LLVM output arrays are related to abstract lower and upper bounds of `Pinf`. This is a compositional proof: exact algorithm proofs are reused through the IRF, while floating-point operations are proved in isolation (Section 4.3, p.136).

limits and assumptions: The theorem does not guarantee that floating-point bounds converge to one value. Correctness depends on safe hardware rounding and excludes NaN/negative cases. A conversion from mcsta’s 128-bit rational probabilities to doubles is unverifed glue; malformed parser output would invalidate the Hoare-triple precondition (Section 5, p.139).

Verus form: Inference: model an interval as a pair of ghost real bounds and prove concrete `f64` operations against an abstract rounding specification. Verus can verify arithmetic contracts if the floating-point model is supplied; the paper’s Isabelle IEEE library and AVX512 semantics would need to be ported or treated as trusted axioms. Keep the numerical bound relation in `requires`/`ensures`; do not claim exact convergence from the floating implementation.

## technique 4: refine data structures and memory safety to LLVM

what it is: the IRF’s `sepref` tool turns nondeterministic HOL programs into LLVM through data refinement and separation-logic heap assertions. Abstract MDP lists become mcsta’s sparse six-array representation `(St, Tr, Br, Pr, ua, ut)`, then 64-bit arrays. The relation preserves the represented MDP and prevents dangling pointers (Sections 2.2 and 4.1, pp.125, 133–134; Section 4.4, p.137).

how to do it:
1. define a refinement relation connecting an abstract value to concrete value and heap
2. register compatible implementation lemmas for operations and data structures
3. provide a sepref signature with preconditions; the tool synthesizes LLVM and proves the relation
4. refine `lb0`, `ub0`, `Finf` and the stopping flag over the sparse-matrix data structure
5. compose operation refinements and apply the final Hoare triple (Sections 4.1, 4.4 and 4.5, pp.133–139)

The paper’s example refines list append and natural-number division to array-list and 64-bit implementations; a precondition limits list length below `2^63−1` (Example 2, p.134). The six-array MDP encoding is illustrated with concrete arrays for a four-state example (Example 3, p.137).

evidence: The generated LLVM implementation replaces mcsta’s unverifed interval iteration. On 49 QVBS benchmark instances containing 10^6–10^8 states and requiring at least two iterations, none timed out at ten minutes; the verified implementation matched the two unverifed implementations in runtime and reached ε on every instance (Section 5, pp.139–140). It used approximately 20% more RAM than the managed C# implementation on average, while matching the safe-rounding C implementation’s memory use (p.141).

Verus form: Inference: use ownership and slices to express the sparse arrays, with `requires` for non-overlapping ranges and valid indices and `ensures` for representation invariants. Verus’s borrow checking handles part of the separation argument, but the exact sparse-array relation and LLVM code-generation correctness remain outside a Rust proof unless the generated code is independently verified.

## trusted boundary, contradictions, and VL implications

The formal trusted base includes Isabelle’s small kernel, the IEEE floating-point formalization, IRF/sepref semantics, AVX512 rounding behavior, LLVM semantics and the mcsta parser/glue. The authors state that “As long as parts of the toolchain remain unveriﬁed, we rely on the correctness of the mcsta implementation for the preprocessing.” (Section 5, p.139). The experiments measure 49 QVBS instances, not all MDPs; observed convergence does not prove universal floating-point convergence.

What has already been done that VL should not redo (Inference): the paper supplies a complete pattern for top-down refinement from an abstract specification to executable low-level code, including explicit numerical rounding relations and memory representation proofs. VL can reuse the pattern for Rust verified components rather than inventing ad hoc floating-point error estimates. Threat to agent-written verified Rust (Inference): moderate for numeric algorithms—Verus proofs can establish Rust-level invariants, but trustworthy floating-point semantics, compiler lowering and parser assumptions remain as important as the source proof.

## techniques for the catalog

- MEC reduction — transform MDPs to trivial/bottom end components while proving reachability preservation
- exact interval iteration — maintain monotone lower and upper Bellman sequences and prove sound convergence
- directed-rounding refinement — relate real values to lower/upper IEEE floats and prove bound-preserving operations
- separation-based code refinement — synthesize LLVM from abstract programs while proving data and heap relations
- end-to-end Hoare triple — compose abstract, numeric and data refinements into one executable correctness statement
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
