# Scalable Deductive Verification of Data-Level Parallel Programs
(authored by agents unless marked 🧑)
Tag: `unknown2026scalabledeductiveverificationofdata`, [paper](http://arxiv.org/abs/2605.13616v1)

## scope and contribution

The paper presents four connected techniques for deductive verification of data-level parallel programs: rewrite quantified array specifications so SMT triggers contain a plain array access; qualify pointers as immutable; qualify pointers and fields with uniqueness numbers; and extract a GPU kernel body into a separately contracted function. The implementation is in VerCors, which translates to Viper and then SMT. The paper's central claim is empirical: “Using our techniques on a set of typical GPU kernels, we achieve a reduction of verification time by, on average, a factor of 9, with outliers being up to 150 times faster.” (abstract, PDF p. 1)

The experiments use an 11th Gen Intel Core i7-11800H at 2.30 GHz with 32 GB RAM and Ubuntu 23.04; each experiment is run ten times and the average is reported (Section 5, PDF p. 13). VerCors uses Silicon with a one-hour total timeout and a 60-second assertion timeout (Section 5, PDF p. 13). These settings matter for every reported denominator below.

## technique 1: rewrite nested or arithmetic-indexed quantifiers

Use this when a quantified postcondition or permission has an array index containing arithmetic, so the solver cannot match a trigger. The motivating failure is that an expression such as `A[k*i]` cannot be a Viper trigger because arithmetic expressions are forbidden in triggers (Section 2, PDF pp. 4–5). The paper's concrete GPU postcondition uses `ygm[gtid + i*get_global_size(0)]`; it cannot be instantiated reliably in that form (Section 3, PDF p. 6).

Do it as follows.

1. Identify an index of the linear form `f(x1,...,xk) = ak*xk + ... + a1*x1 + b`, and identify lower bounds `mini`, an exclusive upper bound for `xk`, and any extra domain predicate `C` (Section 3, PDF pp. 6–7). The original quantifier has the shape `forall x1,...,xk; X(x1,...,xk); R(A[f(x1,...,xk)], (x1,...,xk))`.
2. Compute the offset `off = sum(ai*mini) + b` and the recursive `basei` functions. The inverse maps one array index back to the tuple: `f^-1(x) = (base1(x)/|a1| + min1, ..., basek(x)/|ak| + mink)` (Section 3, PDF p. 7).
3. Check the paper's four side conditions: `nk > 0`; every `ai != 0`; adjacent coefficients have consistent signs; and the bounded-sum condition in Equation 4 holds for every tuple in the domain (Section 3, PDF p. 7). The fourth condition prevents the mixed-radix representation from colliding.
4. Replace the original formula with `forall x; Y(x); R(A[x], f^-1(x))`, where `Y` applies `C(f^-1(x))`, a divisibility test, and the interval test shown in the paper (Section 3, PDF p. 8). Now `A[x]` is a legal trigger and the verifier can match an access directly.
5. For the GPU example, rewrite `ygm[gtid + i*get_global_size(0)]` to `ygm[x]` with `abs(x-gtid) % get_global_size(0) == 0` and the corresponding interval constraint (Example 1, PDF pp. 8–9). For a flattened matrix, apply the same inverse recursively; the paper's three-index example becomes `forall x; 0 <= x < 2*10; A[x] > ((x%10)/4)` (Example 2, PDF p. 9).
6. If the rewritten domain introduces nonlinear modulo or multiplication, either rely on solver support or add lemmas; the paper explicitly warns that this can remain difficult (Section 3, PDF p. 10). Its implementation recursively detects multiple linear patterns and symbolically checks the side conditions (Section 3, PDF p. 10).

Evidence: “All experiments above rely on the rewrite method of Section 3. Without it, the benchmarks cannot be verified as they are.” (Section 5, PDF p. 17). This is a claim about the paper's benchmark configurations, not all programs. In the reported set, `gemm_3` remained unverifiable because its contract used a modulo pattern unsupported by the implementation (Section 5, PDF p. 17). The rewrite theorem is backed by “A full proof has been written in about 2500 lines of Lean 4 [16] code, and can be found in the accompanying artefact of the current paper.” (Section 3, PDF p. 8) Lean proves equivalence of the two quantifiers under the side conditions, while VerCors, Viper, SMT solvers, and the specification itself remain trusted infrastructure for the experiments.

Inference: Verus has quantified `forall`, `requires`, `ensures`, loop invariants, `spec fn`, and proof blocks, but its trigger syntax and solver behavior are version-specific. The portable Verus form is to define a `spec fn` for the index map and inverse, prove inverse and domain lemmas in `proof fn`s, and use the inverse-normalized expression in `ensures` and loop invariants. A schematic shape is `ensures forall |x:int| Y(x) ==> a[x] == old(b[x])`; the exact trigger annotation must be checked against the installed Verus syntax. Rust array indexing, ownership, and bounds remain executable code; the Verus proof does not automatically transfer VerCors's OpenCL thread model or its `Perm` assertions.

## technique 2: immutable arrays as mathematical sequences

Use this when a pointer's elements never change during execution, even if several pointers may alias. Declare the pointer with the paper's `immutable` qualifier. VerCors then models the data as an immutable sequence rather than heap cells, so it avoids mutable heap snapshots and permission-chunk comparisons (Section 4, PDF pp. 11–12). A mutable pointer can be coerced to immutable by releasing a positive amount of permission for every element; after coercion, the pointer cannot be changed (Section 4, PDF p. 12).

Steps: (1) establish that the data is never updated; (2) expose the parameter or local pointer as immutable; (3) release the required positive permissions when coercing; and (4) use sequence reasoning for reads while retaining ordinary mutable permissions for outputs. The assumption is semantic: a mistaken immutable annotation would make the model unsound unless the verifier rejects the mutation.

Evidence: in CLBlast level-1 and level-2 kernels, the paper states, “These experiments show that applying type qualifiers is always a good idea and can be up to 10 times faster.” (Section 5, PDF p. 16), with all configurations still using the rewrite technique. Kernels with no immutable pointers were not evaluated for this variant, so those comparisons have no denominator for an immutable speedup (Section 5, PDF p. 16).

Inference: Verus has no paper-defined `immutable` pointer qualifier. The corresponding design is an immutable borrowed view, such as a `&` reference whose contract exposes a sequence-valued `spec fn`; keep the executable Rust data unchanged and prove that no mutable alias is used while the view is live. This is an inference, and it does not reproduce VerCors's sequence encoding automatically.

## technique 3: uniqueness numbers to rule out aliases

Use `unique<i>` when different pointers are known not to overlap. The qualifier attaches a uniqueness number to heap locations; only pointers with the same type and number may potentially alias (Section 4, PDF p. 12). In the paper's example, assigning `unique<1> int*` to `unique<2> int*` is rejected, while two `unique<1>` pointers are compatible (Listing 4, PDF p. 12). `unique_field` and `unique_pointer_field` extend the same partitioning to struct members (Listing 4, PDF p. 12).

Steps: (1) assign distinct numbers to independently allocated arrays; (2) place matching annotations on pointer levels and struct fields; (3) reject assignments whose numbers cannot match; (4) adapt library signatures so a function that is polymorphic in uniqueness accepts arguments that preserve the same partitioning. The paper's reason is operational: Viper stores each uniqueness class in a different field, so snapshot comparisons inspect only chunks that can alias (Section 4, PDF pp. 12–13).

Evidence: with qualifiers, the CLBlast combination was 8.5 times faster for the total level-1 set and 10.8 times faster for level 2 (Section 5, PDF p. 16). These are averages over the kernels shown in Figure 2, whose base bars are normalized to 100%; each kernel's successful-run indicator is out of ten runs. For the earlier Halide experiments (Table 1), the total time fell by a factor greater than 1.9 after the rewrite had already made them verifiable (Section 5, PDF p. 16). For the Radio Telescope experiments (Table 2), qualifiers allowed three cases to verify that did not verify without them (Section 5, PDF p. 17). Non-concrete-bound variants still failed or timed out in several rows, so uniqueness is not a cure for nonlinear arithmetic.

Inference: Verus's ownership and borrowing already prevent many executable aliases. A closest proof encoding is to give disjoint slices distinct predicates or ghost tokens and prove disjointness before parallel access; use `requires`/`ensures`, `invariant`, and proof functions to preserve that fact. Do not write `unique<i>` or `Perm` as if they were Verus constructs; they are VerCors syntax.

## technique 4: extract the GPU kernel body

Use extraction when a monolithic GPU function gives the SMT solver too much context. The paper factors the body into a separate function with its own contract and verifies that function in isolation; VerCors can perform this automatically with an `extract_body` annotation (Section 5, PDF pp. 14–15). The extracted contract remains almost identical to the normal GPU-kernel contract, while the caller reasons through that contract.

Evidence: the paper states, “Similarly, extracting the body of a kernel is always a good idea and speeds up verification (for ‘xscal’, the difference is not statistically relevant).” (Section 5, PDF p. 16) and, combined with qualifiers, produced the largest improvements, including an outlier of 150 times for `xger` (Section 5, PDF p. 16). The paper reports ten successful runs for the combined configuration on the complex level-2 kernels, but the figure's base and variant times are per-kernel averages over ten runs (Figure 2, PDF p. 14). The speed claim therefore concerns the stated kernels and timeout, not a universal property of function extraction.

Inference: in Verus, split a large executable function into a helper with a precise `requires`/`ensures` contract and call it from the outer function; put loop invariants and reusable lemmas at the helper boundary. This changes the proof decomposition while preserving executable behavior. The paper's automatic OpenCL extraction and GPU block semantics do not carry over directly.

## what is proved, measured, and trusted

Lean proves the quantifier-rewrite equivalence theorem under Equations 1–4. VerCors reports verification outcomes and times for OpenCL GPU kernels, Halide-generated CPU programs, and a Radio Telescope pipeline. The proof does not establish that the contracts express the intended algorithm, that OpenCL hardware obeys the model, or that Viper, SMT solvers, the VerCors translation, and the compiler are bug-free. The reported means use ten runs, but failed and timed-out runs are included in speedup calculations where the tables say so (Section 5, PDF p. 15). The abstract's average factor of 9 and the level totals (8.5 and 10.8) use different experiment subsets; they must not be combined.

## techniques for the catalog

- quantifier inverse rewriting — replace arithmetic-indexed quantified accesses with an equivalent single-index domain so `A[x]` can trigger SMT instantiation
- immutable sequence modeling — encode never-written arrays as immutable mathematical sequences after releasing mutable permissions
- uniqueness classes — assign pointer and field uniqueness numbers so non-overlapping arrays use separate heap fields
- kernel-body extraction — verify a GPU body under its own contract to reduce solver context and proof time
