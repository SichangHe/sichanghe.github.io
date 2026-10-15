# Scalable Shape Analysis for Systems Code
(authored by agents unless marked 🧑)
Tag: `yang2008scalable`, [paper](https://www.semanticscholar.org/paper/091b5c947633830a9c16f5de0c1d232dcd980937)

## result and setting

This paper makes separation-logic shape analysis practical for whole industrial device drivers. It introduces a partial join `⊔†` that aggressively merges symbolic heaps while rejecting merges that lose crucial sharing information. The abstract says: “In this paper we report on a new join operation ⊔† for the separation domain which aggressively abstracts information for scalability yet does not lead to false error reports.” (Abstract, p. 385) SpaceInvader combines the join with context-sensitive, flow-sensitive interprocedural analysis, locality, and state discarding.

The target property is pointer safety: no null or dangling dereference and no memory leak (Section 1, p. 385). The analysis is sequential and assumes array memory safety; circular doubly-linked examples were sometimes rewritten to singly-linked form. Those assumptions are material to every reported result.

## technique: symbolic-heap separation domain

Represent each abstract state as `err` or `Π ∧ Σ`, where `Π` contains equalities/disequalities and `Σ` is a separating-conjunction heap formula. The basic predicates are points-to `e ↦ f` and list segments `ls_k e f`, with `k=NE` for nonempty and `k=PE` for possibly empty. `ls_NE` is defined recursively as a cell followed by another nonempty segment; `ls_PE` is either empty or nonempty (Section 3, pp. 387–389). Existential primed variables stand for hidden heap locations.

The second instantiation parameterizes list nodes by a shape predicate `φ`, allowing nested lists and multiple fields. For example, `ls_NE φ e f` can describe a list whose nodes contain disjoint sublists; a conjunction of two list segments can describe circular lists sharing a header (Section 3, p. 389). This expressiveness is needed for the driver structures.

Inference: in Verus, the closest form is a ghost heap model (maps or sequences of node records) plus `spec fn` predicates for list segments and separation. Verus does not provide a built-in separation-logic abstract interpreter; the join algorithm would be an external analyzer that emits Rust invariants and proof obligations.

## technique: partial join `⊔†` for simple lists

Use the join at program points where disjunctions would otherwise explode. Given heaps `q0=Π0∧Σ0` and `q1=Π1∧Σ1` with disjoint primed variables, compute a common heap `Σ` and witness relation `ϕ′` in two stages (Section 4.1, pp. 391–393).

1. Backward-search the rules in Figure 1 to derive `Σ0,Σ1,∅ ⊢ Σ,ϕ′,δ0,δ1`; matching combines identical points-to facts, two list segments, or a points-to with a list segment (Figure 1, p. 393)
2. Record witness triples `(e0,e1,e′)` for each existential variable in the output. Relations `δi` record input list segments generalized to `PE`
3. Reject the candidate if the witness mapping does not preserve graph sharing: for every mapped pair, equal nonzero source expressions must map consistently, and the opposite source pair must be related by the equivalence closure of `δ` (formal check in Section 4.1, p. 392)
4. If the check succeeds, compute `Π` by retaining unprimed equalities/disequalities present in both inputs, plus selected `x′ ≠ 0` facts justified by witness terms; return `Π ∧ Σ` (Section 4.1, p. 391)

The `PE` constructor is the key controlled abstraction. The paper's malloc loop produces three states—nonempty list, one-cell list, and empty heap—and the join reduces them first to a nonempty list plus empty case, then to one `ls_PE` state (Section 4, pp. 389–390). It can lose precision deliberately: joining `y↦0 * ls_NE x 0` with `ls_NE y 0 * x↦0` yields two independent nonempty lists and loses the fact that one has length exactly one (Section 4, p. 390). The sharing check rejects a structurally unsound merge; the paper's counterexample maps one source `y` to both `0` and `y`, so the join fails (Section 4.1, p. 393).

## technique: composite-structure join

For nested records and list predicates, parameterize points-to and `ls` by `φ`, and define `φ0 ⊔ φ1` by a sound theorem prover over fresh node endpoints. Figure 3 has four rules: combine multi-field points-to facts; combine two list segments; or frame-infer one node shape from the other before joining a node with a list segment. Substitute witness variables back into the parameterized predicate (Section 4.2, pp. 393–394). The worked example joins two nested-list heaps into `ls_PE φ x y * ls_PE φ y 0` because one node description is equivalent to the other under a fresh existential substitution.

Inference: the theorem-prover side condition would become a Verus lemma obligation about `φ0 ⇒ φ1` or vice versa. Since Verus's `spec fn` predicates are executable only in the verifier, an analyzer would need to generate those lemmas and avoid unsupported quantifier patterns.

## technique: selective integration in interprocedural analysis

SpaceInvader stores a set of symbolic heaps at each program point using the RHS interprocedural dataflow algorithm. Pick two states, call `⊔†`, and replace them by the result on success; keep both when it fails (Section 4.3, p. 394). Apply it only at: loop heads; ends of conditionals outside loops; procedure call sites; and procedure exits. These locations control fixed-point growth, conditional path explosion, and procedure-summary size (Section 4.3, pp. 394–395). Keep locality (pass only reachable heap), discard intermediate states, and use context sensitivity; the paper states that turning off any one optimization exceeded 2 GB on at least one example and timed out at 90 minutes (Section 3, p. 389).

## evidence, assumptions, and what remains trusted

Table 1 evaluates seven fixed Windows/Linux drivers on an Intel Core Duo 2.0 GHz with 2 GB RAM; times are proof times for bug-fixed versions, and each reported error was manually confirmed. Results include `scull.c` 1,010 LOC/0.36 s/0.25 MB, `class.c` 1,983/8.21 s/7.62 MB, `ll_rw_blk.c` 5,469/887.94 s/485.87 MB, `md.c` 6,635/1,585.69 s/847.63 MB, and `t1394Diag.c` 10,240/135.05 s/68.81 MB. The memory-leak and dereference-error columns count confirmed bugs in the original drivers; false-error rate is 0% for all seven (Table 1, p. 386). These denominators are seven drivers, not a random population.

Table 2 shows postcondition-state counts for creation harnesses: `firewire_create.c` falls from 3,969 states without join/NE to 32 with join/NE and to 1 with join/PE; `twolist_create.c` falls from 9 to 4 to 1 (Table 2, p. 390). Table 3 reports all-optimization times: `class.c` 8.21 s, `pci-driver.c` 0.97 s, `cdrom.c` 103.26 s, `md.c` 1,585.69 s, and `t1394Diag.c` 135.05 s; the no-join columns time out at 90 minutes for all but `scull.c` (Table 3, pp. 395–396).

The analysis assumes sequential execution, array safety, and usable singly-linked semantics for some drivers. It does not prove array bounds or concurrent pointer safety. The abstract-domain definitions, theorem prover for shape entailment, C front end, operating-system environment model, and SpaceInvader implementation remain trusted. A successful proof establishes the modeled pointer-safety property under those assumptions, not full Rust or hardware correctness.

The experimental mode is explicit: “During our experiments SpaceInvader was used in a stop-first configuration, where the analyzer halts if it cannot prove that a dereferencing operator is safe or if it cannot prove that a cell is reachable.” (Section 2, p. 387) The authors also report: “Note that, during our experiments, no false errors were found.” (Section 2, p. 387)

Inference: this poses a medium threat to agent-written verified Rust. The join strategy could reduce path explosion when generating Verus loop invariants for linked structures, but the paper's analyzer is C/separation-logic specific and predates Rust ownership. VL should reuse selective abstraction and sharing-preservation checks, while avoiding a new generic shape analyzer unless measurements show Verus proof-state explosion.

Inference: what VL should not redo is a benchmark claim that a partial join alone proves industrial memory safety. The paper explicitly attributes performance to the combination of join, locality, and discarding; any Rust evaluation must report each component and its denominator.

## techniques for the catalog

- separation symbolic heaps — represent pointer structure with points-to, list segments, equalities, and separating conjunction
- sharing-preserving partial join — generalize two heaps with witness relations and reject merges that break graph isomorphism
- possibly-empty list abstraction — replace disjunctive empty/nonempty paths with one `ls_PE` predicate when safe
- composite-structure join — recursively join parameterized node shapes using frame inference and theorem-prover side conditions
- selective interprocedural joining — apply the join at loop, branch, call, and procedure-exit points with locality and state discarding

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
