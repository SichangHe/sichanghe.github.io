# Ownership Types for Verification of Programs with Pointer Arithmetic
(authored by agents unless marked 🧑)
Tag: `tanaka2023ownership`, [paper](http://arxiv.org/abs/2312.06455v1)

## central contribution

Tanaka, Sakayori, and Kobayashi extend ConSORT’s ownership-plus-refinement type system from single-cell references to pointer arithmetic and variable-size arrays. The abstract says: “We extend their type system to support pointer arithmetic, and prove its soundness.” (Abstract, p.1). They implement an inference-based verifier for assertion safety. A pointer’s ownership is a function of relative address, while its refinement predicate may also depend on the index. This lets the checker update facts for one array cell without pretending that aliases to other cells changed.

Inference: the closest Verus lesson is to separate permission/ownership facts from value predicates and to make pointer offsets explicit in ghost state. The paper’s type language and automatic inference are not Verus features.

## technique 1: fractional ownership for strong updates under aliases

What it is. A pointer type is `τ ref o`, with ownership `o` in [0,1]. The system enforces three rules: alias ownership sums to at most 1; updating requires ownership exactly 1; and a refinement read through ownership 0 is not trusted (Section 1, pp.1–2). Thus a unique owner can strongly update a cell, while a borrowed alias cannot retain stale value facts.

How to apply it. (1) Assign full ownership to a newly allocated reference (`{ν:int | ν=0} ref 1`) (Figure 1, p.1). (2) When creating an alias, give the alias ownership 0 and keep the original at 1 (Figure 2, p.2). (3) Permit an assignment only through the pointer with ownership 1 (Section 1, p.2). (4) Treat a refinement observed through ownership 0 as untrusted, so `assert (*y = 0)` after `x := 1` is rejected (Figure 2, p.2). (5) If the program establishes that two pointers alias, use `alias(x = y)` to redistribute ownership and propagate the current refinement (Figure 3, p.2). The example redistributes 0.5 to each pointer and proves `assert(*y = 1)`.

Verus form. Inference: represent exclusive permission with Rust mutable ownership/borrowing where possible, and use a ghost permission fraction or token for shared read access. State the value predicate as a `spec fn`; require full permission in a proof function that performs a write; do not use a stale predicate when permission is absent. `requires` and `ensures` can relate the ghost permission and cell value. Verus’s ownership checker is not fractional permission inference, so this encoding needs explicit ghost state and lemmas.

Evidence and limits. The paper’s soundness theorem concerns its language and assumes alias expressions are correct. It explicitly says the type system “does not guarantee the absence of AliasFail” and leaves correct alias analysis to the programmer or tool (Section 3.3, p.8). Thus the assertion guarantee is conditional on alias facts.

## technique 2: index-dependent ownership and refinements for pointer arithmetic

What it is. The extended pointer type is `(λi.τ) ref r`, where `r` maps each relative address to a rational ownership in [0,1] and `τ` may depend on `i` (Section 3.1, p.4). Full ownership at an index permits read/write, fractional ownership permits read, and zero ownership forbids access. The paper writes interval ownership as `{[m,n] ↦ u}`. For example, `{[0,n−1] ↦ 1}` grants full ownership of an array segment (Section 1, p.2).

How to apply it. (1) Allocate `n` contiguous cells with `alloc n` (Section 2, p.3). (2) Give the base pointer ownership `{[0,n−1] ↦ 1}` and an index-dependent refinement, such as `(λi.{ν:int | i=0 ⇒ ν=0})` (Figure 4, p.3). (3) On `p := 0`, strengthen only the predicate for index 0 (Figure 4, p.3). (4) Compute `q = p ⊞ 1`; shift the ownership interval and predicate so q owns indices 1 through n−1 (Figure 4, p.3). (5) Verify the recursive call on q, then use `alias(q = p ⊞ 1)` to merge q’s returned facts back into p (Figure 4, p.3). The final type states all n cells are zero.

Verus form. Inference: represent an array segment as a Rust slice plus a ghost sequence/map indexed by offsets. Use a `spec fn` predicate over `(index, value)` and a ghost permission set or map. A function contract can require ownership of `0..n` and ensure the predicate for every index; pointer addition becomes slice-index arithmetic with bounds in `requires`. Verus does not use `(λi.τ) ref r` syntax, so the index map is an inferred modeling layer, not a direct translation.

Evidence. Figure 9 gives the inferred environments after assignment, pointer addition, recursive initialization, and alias merge (Section 3.2, p.8). The paper also types arrays of pointers with nested index-dependent predicates (Figure 10, p.8). Its scope excludes pointer XOR and casts (Remark 2, p.4).

## technique 3: sound typing via subject reduction and progress

What it is. The type system proves that well-typed programs do not reach assertion failure and do not get stuck, using preservation (subject reduction) and progress. The theorem states: “If ⊢ ⟨D, e⟩, then ⟨∅, ∅, e⟩ ⇏* AssertFail. Moreover, the reduction does not get stuck.” (Theorem 3.3, Section 3.3, p.8). The theorem still permits `AliasFail` or divergence.

How to apply it. (1) Define a typing judgment carrying function environment Θ and type environment Γ, with post-environment Γ′ (Section 3.2, p.4). (2) Ensure refinement formulas hold for the runtime register substitution and that ownership sums for every heap cell are at most 1 (Section 3.3, p.8). (3) Prove each reduction preserves well-typedness (subject reduction) and that a well-typed non-value can step (progress) (Section 3.3, p.8). (4) Conclude no `AssertFail` by induction over execution. (5) Keep alias correctness as a separate assumption because the theorem allows `AliasFail` (Section 3.3, p.8).

Verus form. Inference: state a Rust function’s memory-safety and functional properties in `requires`/`ensures`, and use proof functions for preservation lemmas over a ghost heap model. Loop `invariant`s capture the ownership-sum and refinement facts; `assert` steps expose arithmetic consequences. Verus verifies the concrete Rust program rather than a separately defined reduction semantics, so the subject-reduction proof is an architectural analogy.

Evidence and trust. The paper says the detailed proof is in Appendix B, with lemmas for initialization, preservation, and progress (Section 3.3, p.8; Appendix B, pp.25–27). Trusted inputs include correct alias annotations, the type rules, and the semantics of the target language.

## technique 4: two-phase ownership and refinement inference

What it is. The prototype accepts programs without ownership/refinement annotations and infers them in two phases: ownership inference, then refinement inference (Section 4, p.9). Ownership templates use interval bounds `[l,u] ↦ o` whose endpoints are affine expressions in context variables. Constraints generated from typing rules are solved with Z3; refinement constraints are Constrained Horn Clauses (CHCs) solved by HoIce or another CHC solver (Sections 4.1–4.2, pp.9–10).

How to apply it. (1) Infer ordinary simple types first using unification (Section 4, p.9). (2) Create an ownership template at every program point with unknown affine coefficients and ownership constants (Section 4.1, p.9). (3) Generate constraints for assignment, pointer addition, calls, and ownership-sum bounds (Section 4.1, pp.9–10). (4) Approximate quantified ownership constraints `∃c.∀x.ψ(c,x)` by selecting k sample values, solve the quantifier-free conjunction with Z3, then validate the candidate against the original universal formula; increase k on failure (Section 4.1, p.10). The paper calls this a heuristic and leaves a systematic solver for future work. (5) With ownership fixed, create a predicate variable for each integer type occurrence and generate CHCs expressing assignments, shifts, and well-formedness (Section 4.2, p.10). (6) Solve CHCs and substitute the predicates into the type templates (Section 4.2, p.10).

Verus form. Inference: use an external synthesis phase to propose ghost permission predicates and `requires`/`ensures`, then have Verus prove the resulting contracts. The sample-and-check heuristic is not a sound replacement for Verus proofs; any inferred candidate must be checked by complete Verus obligations. CHC solutions can suggest `spec fn` definitions and loop invariants, but proof functions must establish them for all indices.

Evidence and limits. The authors call the inference “sound (but incomplete)” (Section 4, p.9). Their own bottleneck is the quantified `∃∀` heuristic; timeouts can occur even when a formula is valid (Section 5, p.12). The interval ownership restriction cannot express alternating ownership such as indices 0 and 2 full, index 1 zero (Example 4.3, p.10), and lack of polymorphic function types blocks a dependent-pointer variant (Example 4.4, p.10).

## technique 5: evaluate automated pointer verification against benchmarks

The prototype inserts trivial alias annotations automatically and then runs ownership/refinement inference (Section 5, p.11). Benchmarks include Init, Sum variants, Copy-Array, Add-Array, and Init-10, with array length 1000 except Init-10 (Section 5, p.11). The tool uses Z3 4.11.2 and HoIce 1.10.0; experiments run on 16 GB RAM and Apple M2 CPUs with a 600-second timeout (Section 5, p.11).

Table 1 reports successful runtimes in seconds: Init-10 1.67, Init 3.69, Sum 2.01, Sum-Back 0.54, Sum-Both 1.07, Sum-Div 0.83, Copy-Array 31.31, and Add-Array 338.30 (Table 1, p.12). SeaHorn with HoIce produced tool errors for Init-10, Sum, and Sum-Div and timed out on the other benchmarks except Init-10 with Spacer at 0.37 seconds (Table 1, p.12). These are one run per benchmark under the stated timeout; no variance is reported. The authors attribute their advantage to integer predicates rather than heap-array predicates (Section 5, p.12), but this comparison also manually translated programs to C for SeaHorn (Section 5, p.11).

Inference: the results show feasibility for the chosen toy language, not performance on unsafe Rust or arbitrary pointer arithmetic. The product threat is high if an agent assumes inferred alias facts are correct; the paper makes alias correctness an explicit trusted boundary. VL should reuse the ownership/refinement separation and avoid rebuilding ConSORT’s established soundness theorem.

## proved, measured, and trusted

Proved: subject reduction, progress, and absence of `AssertFail` for well-typed programs, conditional on alias correctness (Theorem 3.3, Section 3.3, p.8). Measured: benchmark verification times and comparison with SeaHorn under specified hardware, solver versions, and timeout (Table 1; Section 5, pp.11–12). Trusted: target-language semantics, typing rules, Z3/CHC solver results, generated alias expressions, and the assumption that `AliasFail` never occurs. The paper does not prove the prototype’s must-alias analysis sound; it says “It is the responsibility of the programmer or the tool used for the alias analysis to ensure that the inserted alias expressions are correct.” (Section 3.3, p.8).

## techniques for the catalog

- fractional ownership — use ownership fractions to control reads, writes, and refinement trust under aliases
- index-dependent arrays — map relative addresses to ownership and per-index refinement predicates
- alias merge hints — use alias equations to redistribute ownership and merge updated facts
- sound typing theorem — prove preservation and progress to exclude assertion failures under alias assumptions
- two-phase inference — solve interval ownership constraints, then CHCs for refinements
- quantified heuristic — sample quantified ownership constraints, solve, and validate universally
- pointer benchmark evaluation — report solver versions, hardware, timeout, benchmark lengths, and per-case runtimes

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
