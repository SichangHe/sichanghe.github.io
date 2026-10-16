# FormalEvolve: Neuro-Symbolic Evolutionary Search for Diverse Autoformalization
(authored by agents unless marked 🧑)
Tag: `lu2026formalevolve`, [paper](http://arxiv.org/abs/2603.19828v4)

## problem and main claim

FormalEvolve treats Lean autoformalization as fixed-budget search for a repertoire of statements rather than one translation. The paper says, “Autoformalization translates informal mathematics into Lean statements that compile and preserve the intended mathematical claim.” It then identifies a downstream issue: “A formal statement that compiles and preserves the intended claim is not necessarily a prover-friendly target.” The method therefore keeps multiple compilation-feasible, semantically judged candidates and tests them with a fixed proof-attempt budget.

Inference: for Verus, the analogous object is a set of compilable Rust/Verus specifications or proof-annotated program variants whose contracts are equivalent enough for the target requirement but expose different solver behavior. The Lean experiments do not establish that the same search gains hold for Verus.

## technique 1: compilation-gated archive search

What it is. The archive is per informal problem, stores unique candidates that pass Lean compilation, and is reused for parent selection and prompt context. Semantic success is a separate predicate. The paper states: “Compilation is a hard feasibility gate: only candidates with Comp(c) = 1 can enter the archive and be reused as parents.” The archive can retain compilation-valid but semantic-negative stepping stones; only candidates satisfying both predicates enter the reported repertoire.

When to use it. Use this when many formal artifacts can express one informal requirement and a downstream prover is sensitive to statement shape. It is useful when a fixed generation budget makes repeated independent sampling wasteful.

How to do it.

1. Represent each candidate as a complete Lean file with imports and a statement; define `Comp(c)` by Lean compilation and `Sem(c)` by the semantic judge (Section 3.1).
2. Initialize a seedbank with `Mseed`; compile and semantically judge each seed, inserting every unique compilation-feasible candidate (Section 3.1).
3. Maintain `K` semi-isolated islands. Sample an island, then a parent and context from that island; reject canonical duplicates at insertion (Section 3.1).
4. Give a parent score `s_i = Comp(c_i)(1+Sem(c_i))`, normalize by a median and MAD, and multiply the sigmoid score by a usage discount `u_i=[1+(1+β)n_i]^{-1}`. Sample proportionally to `w_i=σ(λz_i)u_i` (Equation 2).
5. Add candidates to the archive when `Comp=1`; form the output repertoire by deduplicating candidates with `Comp=1 ∧ Sem=1` (Algorithm 1).
6. Migrate the top candidate between islands every 10 generations at rate 0.1 in the main configuration (Section 4).

Verus form. Inference: implement an archive outside the verifier, driving `verus` on each candidate. A candidate can be a Rust module containing executable functions, `spec fn` contracts, `requires`/`ensures`, loop `invariant` clauses, and `proof fn` lemmas. Compilation/verification is the hard gate; semantic scoring must compare the candidate contract with a requirement because Verus does not provide the paper’s Lean semantic judge. Keep only verified candidates for proof search, while retaining failed semantic candidates only as search context if their verification result is known. Do not use `invariant(...)` as a call, `modifies`, or `ensures` on a `spec fn`; these are not constructs documented in the Verus reference used for this study.

Evidence and limits. The main configuration uses `T=100` generator calls per problem, `K=2`, archive capacity 40, `λ=10`, `β=0.05`, and full/diff/cross patch probabilities 0.5/0.3/0.2 (Section 4). On CombiBench (`N=100`), SH@100 rose from 0.530 for the matched Hybrid no-archive control to 0.580 (paired 95% CI [0.003, 0.130]); on ProofNet test (`N=186`) it rose from 0.828 to 0.849 (paired 95% CI [0.005, 0.048]) (Table 1). The denominator is problems, not candidates. The paper’s semantic labels come from CriticLean-Qwen3-14B, so the authors add manual calibration; this is a trust boundary, not a proof of semantic equivalence.

## technique 2: mutation, crossover, bounded repair, and call-free AST diversification

What it is. A selected parent is edited by full patching, localized diff patching, or cross patching that combines an inspiration candidate. Compiler errors or semantic-judge rationales trigger bounded repairs. The paper says, “All three templates return a complete Lean 4 file (imports plus a single statement) and are budgeted identically as generator calls.” When patching stalls, EvolAST applies a generator-call-free rewrite inside binder types and goal types, preserving imports and preamble.

How to do it.

1. Select a parent and sampled context from the archive (Algorithm 1).
2. Choose full, diff, or cross patching; ask `Mpatch` for a complete candidate conditioned on the informal theorem and parent (Section 3.2).
3. Compile the full file. If it fails, issue at most two compiler-feedback repair calls; debit every call (Section 3.1).
4. If compilation succeeds but `Sem=0`, optionally issue bounded semantic repair using the judge rationale; re-evaluate (Section 3.1).
5. If duplicates or failures stall progress, apply at most one EvolAST representative. Rewrite only binder types and goal types, keep imports unchanged, and filter the result through compilation and semantic gates (Section 3.2).

Verus form. Inference: full patching can rewrite a verified Rust function and its contract; diff patching can change one clause or expression; cross patching can copy a lemma or type pattern from another verified candidate. Run `verus` after each patch and feed diagnostics into a bounded repair prompt. AST diversification can rewrite mathematically equivalent type/term structure while preserving Rust imports and executable behavior. Proof-only code must remain in `proof fn` or `#[verifier::proof]` contexts; executable functions cannot call proof functions at runtime.

Evidence. Removing patch repair reduced SH@100 from 0.580 to 0.470 on CombiBench (`N=100`) and from 0.849 to 0.780 on ProofNet (`N=186`), identifying repair as the largest direct driver in these experiments (Section 5.1). The no-EvolAST ablation gave 0.500 versus 0.580 on CombiBench and 0.871 versus 0.849 on ProofNet, showing dataset-dependent trade-offs; these values are SH@100 fractions over the stated problem denominators.

## technique 3: measure coverage, concentration, and downstream proof utility together

The paper reports compile coverage CH, semantic coverage SH, semantic density, yield, deduplicated repertoire size, Gini concentration, top-10% share, and fixed-budget proving. It warns that “Coverage alone leaves open whether additional semantic successes are broadly distributed or concentrated on a small set of already-easy problems.” Use per-problem semantic-success counts `s_j(T)`; report Gini and the share assigned to the easiest 10% (Section 4). Then run Goedel-Prover-V2-32B for `B=64` round-robin attempts over the deduplicated repertoire; report pass@64, complete@64, and theorem-complete@64 (Section 5.2).

Results. Table 2 reports CombiBench (`N=100`) theorem-complete@64 of 13/100 for FormalEvolve versus 9/100 Hybrid, 8/100 Sample, and 8/100 C+S Repair. For ProofNet (`N=186`), FormalEvolve gives 45/186 versus 40/186 Hybrid and 46/186 C+S Repair. The denominator and prover budget are explicit: 64 attempts per problem. Manual audits on a 50-problem ProofNet statement slice counted Faithful/Partial/Severe as 42/5/3 for FormalEvolve; a separate 161-artifact theorem-complete audit found 41 faithful artifacts and 11 severe cases for FormalEvolve (Section 5.4).

Inference: a Verus evaluation should report verified-contract coverage, semantic-equivalence audit rates, solver time, and downstream proof completion under a fixed attempt budget. It should separate what Verus checks from what the semantic judge and Rust libraries are trusted to establish.

## trusted scope, failures, and product threat

The paper explicitly limits semantic certification: “Semantic consistency remains difficult to certify automatically.” Its judge is an LLM, and the authors calibrate it manually. Proof success is only for the encoded Lean statement under the fixed prover protocol; it does not prove that an informal requirement was formalized correctly. The benchmarks are ProofNet test (`N=186`) and CombiBench (`N=100`), and the stronger-base supplementary run changes models, so its 0.86→0.88 SH@100 comparison is not a general model-independent result.

Inference: the threat to agent-written verified Rust is moderate for specification generation and proof search: an archive could find solver-friendly variants and reduce repeated repair, but it cannot decide whether a Verus contract captures the product requirement, and failed or misleading semantic judgments remain possible. Existing VL work should not redo the basic idea of verifier-gated candidate search with fixed budgets; a new contribution would need Verus-specific semantics, trusted-boundary accounting, and maintenance evidence.

## techniques for the catalog

- compilation-gated archive: retain unique verifier-passing candidates and reuse them as parents and context under a fixed call budget
- bounded repair and AST fallback: use compiler/judge feedback for capped edits, then apply call-free structural rewrites when mutation stalls
- repertoire evaluation: measure semantic coverage and concentration, then test deduplicated candidates under a fixed downstream prover-attempt budget
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
