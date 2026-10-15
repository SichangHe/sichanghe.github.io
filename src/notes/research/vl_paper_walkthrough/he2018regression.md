# When Regression Verification Meets CEGAR
(authored by agents unless marked 🧑)
Tag: `he2018regression`, [paper](http://arxiv.org/abs/1806.04829v1)

## problem and result

The paper targets repeated verification of evolving programs. Its central claim is that state based procedure summaries can be saved after one CEGAR run and reused for a later revision. The abstract says: "Procedure summaries, which describe the input/output behaviors of a procedure, are proposed as the intermediate results to be reused." (Abstract, p. 1). The implementation extends CPAchecker with summary dumping, loading, reduction, and lazy counterexample analysis. The evaluation uses 534 revisions of 89 Linux kernel device drivers; the authors report 31.4% less verification time for summary reuse (Introduction, p. 2; §7.1, p. 7).

## technique 1: state based summaries in CEGAR

What it is. A summary for procedure `f` under precision `λ` is a pair `<φin, φout>` of conjunctions of predicate literals. The input formula is complete; the output formula may be partial because one input abstract state can reach several exit states (§4.1, p. 4). A summary means that every output state of `f` reached from an input satisfying `φin` satisfies `φout`. The paper's motivating example summarizes `inc(a,sign)` with `<¬(sign = 0), ¬(sign = 0) ∧ rv > a>` for the `sign != 0` branch and `<sign = 0, sign = 0 ∧ ¬(rv > a)>` for the other branch (§3, pp. 3–4).

When to use it. Use summaries when a procedure has multiple call sites or remains unchanged across revisions. At a call, look in a cache for a summary with the same abstract precision whose input condition is satisfied by the current abstract state. If found, return its output condition; otherwise perform the ordinary intra procedural analysis (§4.1, p. 4). This avoids reanalyzing a body at every call site. The paper states: "A procedure summary (or shortly, a summary) describes the input/output behaviors of a procedure." (§2.1, p. 3).

How to apply it, following the paper. (1) Choose a procedure level abstract precision, a set of predicates. (2) During predicate analysis, record the complete input predicate valuation and each reachable output valuation as a summary. (3) On a call, require exact precision equality and test satisfiability of the summary input formula against the current abstract state. (4) Use the output formula as the call's abstract result, or analyze the procedure if no entry applies. The paper's formulas show the code shape: `⟨¬(sign = 0), ¬(sign = 0) ∧ rv > a⟩` (§3, p. 3).

Verus form. Inference: represent a reusable result as a proof lemma or a specification function describing a procedure's relation between input and output, and call that lemma from a caller proof. Use `requires` for the input condition and `ensures` for the output relation on an executable `fn`; use `spec fn` for mathematical predicates and `proof fn` for erased proof steps. Verus does not expose CPAchecker abstract states or predicate precisions, so the CEGAR cache and solver state would be an external proof-generation layer. The executable Rust procedure remains unchanged except for its contract; a summary is sound only if its contract is proved for the current body.

Evidence. The paper's toy program derives two summaries and reuses them at a later invocation without entering `inc` (§3, pp. 3–4). In the revision example, the unchanged `inc` summaries prove the new `main` safe without looking into `inc` (§3.2, p. 4). The general experiment reports 445 regression tasks (five mutations for each of 89 drivers), with standalone total time 670.4 s and summary reuse 460.2 s, a 31.4% speedup; totals are across all 445 tasks and include all CEGAR steps and summary processing (§7, pp. 6–7; Table 1, p. 8). The table's total result counts are 418 safe and 27 unsafe for the run set, not a percentage (§7.1, Table 1).

Assumptions and failure. A cached summary is usable only under the same precision and a satisfied input condition. A changed procedure must not reuse its old summaries unless it is semantically equivalent. The paper uses syntactic comparison as a cheaper approximation and keeps only procedures whose transitive callees are also unchanged (§5.2, p. 5). This can discard semantically equivalent but syntactically changed code. Abstraction is conservative, but a coarse precision can produce spurious counterexamples and a fine precision can cause state explosion (§2.1, p. 3).

## technique 2: OBDD representation and summary reduction

What it is. The cache test can require many satisfiability checks. The authors store an OBDD for each input and output Boolean function; OBDD can test equivalence in constant time because of canonicality (§4.2, p. 4). A summary also contains predicates irrelevant to its procedure. Reduction computes the variables accessed by `f`, removes predicates containing no such variable from the precision and from both formulas, then performs cache lookup with the reduced precision and state (§4.3, pp. 4–5). Their example removes `y > 0` from a summary for `inc`, making it applicable at a second call (§4.3, p. 5).

How to apply it. (1) Build Boolean decision diagrams for each summary's input and output formulas when writing the cache. (2) At lookup, compare the current precision with the summary precision and test the input condition. (3) Compute the procedure's accessed-variable set. (4) Delete irrelevant predicates from the precision, input, output, and current state. (5) Perform lookup after reduction. The paper warns that this is an optimization and does not remove all redundancy; quantifier elimination is more powerful but slower (§4.3, p. 5).

Verus form. Inference: use a `spec fn` for the summary relation and prove equivalence or implication lemmas with `proof fn`; cache keys can be generated from normalized specifications outside Verus. OBDDs are an implementation choice for a proof-reuse service, not a Verus language construct. Variable relevance can guide which ghost facts are passed to a proof, but deleting a predicate is sound only when the resulting contract is re-proved.

## technique 3: cross revision dump/load and lazy counterexample analysis

Cross revision reuse dumps every cache entry to a text file after verification and loads it before verifying the next version (§5, p. 5). The file groups entries by procedure name and type signature, records predicates in SMT-LIB syntax, and stores summaries by precision (Fig. 4, p. 5). Syntactic comparison computes the set of unchanged procedures and recursively filters out callers whose callees changed. The paper's soundness statement is: "For any procedure in τP∗, its two versions in P and P′ are semantically equivalent." (Lemma 5.1, §5.2, p. 5).

Counterexample analysis is lazy because a reused summary has no cached intra procedural reached set. A call is a hole when that reached set is unavailable (§6.1, p. 6). The algorithm repeatedly checks whether the path is holeless or already infeasible; otherwise it expands one hole. It returns an infeasible expanded path or `unsafe` when a fully expanded path is feasible (Algorithm 1, §6.2, p. 6). The paper's key limitation is explicit: "if all segments in Π are feasible, π is, however, not necessary to be feasible." (Theorem 6.3, §6.2, p. 6). Thus separately feasible segments cannot establish whole-path feasibility across a hole.

Verus form. Inference: a Verus proof can defer expanding a called function by using its contract, then open the callee proof only when the caller's postcondition cannot be established. A failed proof obligation is analogous to a spurious counterexample, but Verus does not expose holes or an incremental CEGAR API; implementing this policy requires an external proof orchestrator and stable contracts. The caller's final `ensures` must still be proved, and any opened callee must have a verified contract.

Evidence and limits. In the 445-task lazy-analysis experiment, the technique improved total time by more than 5% in 312 cases, refinement time in 376, and produced shorter counterexamples in 430 cases (§7.3, p. 7). Summary reduction was more than 5% faster in 341 cases, including 73 timeout cases; 92 cases were within ±5%, and 12 were more than 5% slower (§7.2, p. 7). Each case is one regression task; timeouts are projected onto the corresponding plot axis. The machine was an 8-core 3.6 GHz system with 16 GB RAM, four verifier cores, 11 GB Java heap, and a 90 s run limit (§7, p. 6). These measurements concern CPAchecker and mutated Linux drivers. Inference: the results indicate a substantial opportunity for proof reuse in VL, but they do not establish that Verus proof scripts or SMT contexts have the same hit rate or speedup.

## what is proved, trusted, and left undone

The paper proves its cache-use conditions by syntactic unchangedness plus unchanged transitive callees, and reports empirical performance. It trusts CPAchecker, predicate abstraction, SMT satisfiability checks, the syntactic equivalence approximation, the summary serialization, and the benchmark mutation process. Inference: a VL product would additionally trust the translation from Verus contracts to solver obligations, the identity of the linked Rust body, and any external cache invalidation rule. Reusing a summary after a dependency or specification change is unsafe unless that change is part of the invalidation key. The work already covers procedure-summary reuse, summary reduction, and lazy expansion; VL should not redo those ideas without a Verus-specific contribution.

## threat to a product of agent-written verified Rust

Inference: the threat is moderate. Reuse can shorten agent repair loops and reduce repeated solver work, but stale summaries can hide a changed callee if change detection is incomplete. Agent-written contracts may also be weak or inconsistent, so a fast reused proof can certify the wrong promise. A practical VL integration would key cached lemmas by procedure body, transitive dependency, contract, and verifier configuration, and would invalidate on any mismatch. This is an engineering inference, not a result measured by the paper.

## techniques for the catalog

- state based procedure summaries — cache input/output predicate relations and apply a matching summary at each call
- OBDD summary representation — store canonical decision diagrams to accelerate summary-condition checks
- irrelevant predicate reduction — remove predicates over variables a procedure does not access before cache lookup
- syntactic transitive unchangedness — reuse summaries only for procedures whose bodies and callees are unchanged
- lazy counterexample analysis — expand a missing procedure path only when the current abstract path is neither holeless nor infeasible

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
