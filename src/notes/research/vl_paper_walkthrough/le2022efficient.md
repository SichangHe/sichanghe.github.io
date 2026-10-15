# An Efficient Cyclic Entailment Procedure in a Fragment of Separation Logic
(authored by agents unless marked 🧑)
Tag: `le2022efficient`, [paper](http://arxiv.org/abs/2210.00616v1)

## purpose and scope
S2SLin decides quantifier-free entailments in SHLIDe, a fragment of separation logic with compositional inductive predicates and pure properties. The paper's abstract states, “In this paper, we present a decision procedure that can derive cyclic entailment proofs for general inductive predicates in polynomial time.” (Abstract, p. 1). The fragment captures nested lists, skip lists, sorted segments, and binary search trees (§2, pp. 3–5). The procedure avoids backtracking by normalizing right-hand-side unfolding so it produces one disjunct.

The input is `∆a ⊢ ∆c`, where both formulas are quantifier-free symbolic heaps with pure constraints and the free variables of the consequent are drawn from the antecedent plus `null` (§3, p. 5). Entailment means every stack and heap satisfying `∆a` also satisfies `∆c`.

## technique 1: SHLIDe predicate discipline

Use SHLIDe when inductive predicates can be expressed as connected compositional segments with local data properties. A predicate has a root and segment endpoint, optional border/reference parameters, transitivity data, and ordering parameters (§2.1, pp. 3–4). Three conditions constrain definitions: recursive fields must be node fields (C1), matrix heaps must be nested and connected with established existential variables (C2), and predicates cannot be mutually recursive (C3). Examples in the paper define `ll`, nested `nll`, skip-list `skl1`–`skl3`, `tree`, a transitive list `lla`, and sorted list `lls` (§2.1, pp. 4–5).

Apply it by (1) writing base and recursive clauses with an empty segment base case, (2) ensuring every recursive pointer is a field of the root node, (3) composing nested predicates only through connected parameters, (4) avoiding mutual recursion, and (5) adding pure sortedness or transitivity parameters. Inference: a Verus encoding would use recursive ghost predicates or `spec fn` definitions over a mathematical sequence/tree and separately prove that the Rust representation satisfies C1–C3; the paper has no Verus encoding.

## technique 2: exclude-the-middle normalization

Unfolding an inductive predicate normally creates a disjunction (base versus recursive case), which causes exponential search. S2SLin first puts the antecedent into normal form. A normal form records guards (`root != endpoint`, `root != null`), pairwise root disequalities, absence of contradictory equalities, and satisfiable pure arithmetic (§4.1, pp. 8–9).

The central `ExM` rule splits an inductive predicate between `E=F` and `E≠F`, but each branch remains a single consequent. The paper's list example turns `x↦c(z) * ∆ ⊢ ll(x,y) * ∆'` into two premises, one with `x=y` and one with `x≠y`, instead of unfolding `ll` into a disjunction (§3.1, pp. 5–6). Normalization rules `Subst`, `=L`, `6=null`, and `6=*` propagate substitutions and distinctness; Figure 2 gives their premises and side conditions (§4.1, p. 9).

Steps: (1) exhaustively apply normalization rules to a leaf, (2) split root/segment equality with `ExM`, (3) substitute equal variables, (4) derive non-null and unequal-root facts, and (5) continue only after the leaf is in normal form. Inference: in Verus, analogous case splits are Rust/ghost `if` branches plus `assert` facts; there is no built-in normalization engine, so this would be a proof library rather than a direct annotation.

## technique 3: cyclic proof search and backlinks

A cyclic proof is a finite proof tree with leaves that are axioms, invalid, or backlinks. A backlink connects a bud to an ancestor companion under a substitution. Global soundness requires every infinite path to have infinitely many progressing unfoldings of an inductive predicate (§3.2, pp. 6–7). The paper explains, “if every cycle contains an unfolding of some inductive predicate, then that predicate is infinitely often reduced into a strictly ‘smaller’ predicate” (Introduction, p. 2).

The algorithm `ω-ENT` is explicit (Fig. 1, §4.1, p. 8): (1) initialize the root and reset unfolding numbers; (2) inspect an open leaf with `is closed`; (3) return valid if all leaves are closed valid/backlinked; (4) return invalid if a normal-form leaf has no applicable rule or violates a structural condition; (5) otherwise try `link back`; (6) if no backlink exists, apply the selected rule and repeat. `LInd` unfolds a left-hand inductive predicate and increments its unfolding number; `RInd` unfolds a right-hand predicate; `Frame`, `LBase`, and `RBase` match heap fragments. The paper's worked proof of `lls(x,null,mi,ma) ⊢ llb(x,null,mi)` applies `LInd`, `ExM`, substitution, `LBase`, `RInd`, and a backlink `[x/X, mi/m′]` (Fig. 4 and §4.2, pp. 11–13).

Verus form (Inference). A cyclic proof can be represented by a recursive `proof fn` whose decreasing argument is a sequence/tree measure, with `decreases` proving progress; each backlink becomes a recursive lemma call under a substituted ghost state. Verus does not accept arbitrary cyclic proof graphs, so the algorithm's finite-tree construction would need to generate ordinary recursive lemmas.

## technique 4: soundness, completeness, and complexity boundary

Each inference rule is locally sound. Backlinks are sound by construction because the linked predicate is a subterm of the unfolded predicate; therefore the global cyclic condition follows (§5, pp. 13–14). The procedure terminates because only finitely many entailment equivalence classes arise under substitution and each left predicate is unfolded at most twice (Lemmas 5.4–5.5, p. 14). Theorem 5.11 states that QF ENT-SLLIN is decidable.

The complexity proposition is `O(n × 2^m + n^3)`, where `n` is the maximum number of predicates/points-to predicates in the input and definitions and `m` is the maximum number of data-structure fields (Proposition 5.6, p. 14). Thus it is polynomial when `m` is a fixed constant. This bound assumes the SHLIDe restrictions; it is not a complexity claim for arbitrary separation logic.

## evidence and numerical audit

The OCaml prototype was evaluated on SL-COMP 2022 with 296 qf_shls_entl problems (122 invalid, 174 valid), 60 qf_shlid_entl problems (24 invalid, 36 valid), and 27 new qf_shlid2_entl problems (14 invalid, 13 valid), for 383 listed problems in the three divisions (Experiment settings, §6, pp. 15–16). The table reports S2SLin correct outputs of 122/122 invalid and 174/174 valid in the first division, 24/24 and 36/36 in the second, and 14/14 and 13/13 in the third, with times 6.22 s, 0.96 s, and 1.20 s (Table 1, p. 16). These sum to 8.38 s, matching the text's total.

The text separately reports 569 tests when comparing all tools, because it includes additional benchmark accounting beyond the three S2SLin division totals; that denominator is stated as 569 for the cross-tool comparison. CyclistSL handled 85/569 (15%), Harrsh 215/569 (38%), and Songbird 235/569 (41.3%) within the 600-second CPU timeout (§6, p. 16). Of 223 valid tests, Songbird decided 222/223 (99.5%). The paper says, “In general, the experimental results show that S2SLin is the one (and only one) that could produce all the correct results.” (Experiment results, §6, p. 16). Results are on an Intel Core i7-6700 3.4 GHz machine with 8 GB RAM; the benchmark statuses are treated as ground truth. The favorable denominator is therefore the SHLIDe-compatible benchmark set, not arbitrary heap programs.

## trusted boundary and VL implications

The proof trusts the SHLIDe definition discipline, local rule soundness, least-fixed-point semantics, arithmetic/equality solver, OCaml implementation, and SL-COMP labels. It proves entailment only for the decidable fragment and does not prove memory safety of a Rust implementation by itself. Inference: VL could use this procedure as a ghost entailment engine for linked-structure views, but translating arbitrary Verus ownership and executable pointer code into SHLIDe is a separate soundness problem. Inference: agent-written verified Rust remains threatened by heap-shape and alias facts that fall outside the fragment; a solver returning “stuck invalid” is not evidence that the Rust code is wrong unless the encoding is faithful. Inference: VL should not redo a generic cyclic-entailment algorithm; it should test whether SHLIDe-style normalization and bounded-field conditions cover the project's actual data structures.

## techniques for the catalog
- SHLIDe predicate restrictions — constrain compositional recursive heaps so entailment is decidable
- exclude-the-middle normalization — split endpoint equality and normalize heaps without RHS disjunctions
- cyclic backlinks — close inductive proof branches by linking smaller unfolded predicates to ancestors
- ω-ENT search — iterate normalization, axioms, backlinks, and reduction rules until valid or invalid
- local-to-global soundness — require each backlink to contain a progressing subterm unfolding
- bounded-field complexity — obtain `O(n × 2^m + n^3)` and polynomial time for constant field bound
Checked 2026-10-14 against the paper by a Codex agent: audit record le2022efficient; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
