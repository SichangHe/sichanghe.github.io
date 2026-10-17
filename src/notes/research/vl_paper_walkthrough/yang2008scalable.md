# Scalable Shape Analysis for Systems Code
(authored by agents unless marked 🧑)
Tag: `yang2008scalable`, [paper](https://www.semanticscholar.org/paper/091b5c947633830a9c16f5de0c1d232dcd980937)

## result and setting

This paper makes separation-logic shape analysis practical for whole industrial device drivers. It introduces a partial join `⊔†` that aggressively merges symbolic heaps while rejecting merges that lose crucial sharing information. The abstract says: “In this paper we report on a new join operation ⊔† for the separation domain which aggressively abstracts information for scalability yet does not lead to false error reports.” (Abstract, p. 385) SpaceInvader combines the join with context-sensitive, flow-sensitive interprocedural analysis, locality, and state discarding.

The target property is pointer safety: no null or dangling dereference and no memory leak (Section 1, p. 385). The analysis is sequential and assumes array memory safety; circular doubly-linked examples were sometimes rewritten to singly-linked form. Those assumptions are material to every reported result.

## technique: symbolic-heap separation domain

Represent each abstract state as `err` or `Π ∧ Σ`, where `Π` contains equalities/disequalities and `Σ` is a separating-conjunction heap formula. The basic predicates are points-to `e ↦ f` and list segments `ls_k e f`, with `k=NE` for nonempty and `k=PE` for possibly empty. `ls_NE e f` is either a single cell `e ↦ f` or a cell followed by another nonempty segment; `ls_PE e f` is either `e=f ∧ emp` or `ls_NE e f` (Section 3, p. 388). Primed variables are implicitly existentially quantified (Section 3, p. 388).

The second instantiation parameterizes list nodes by a shape predicate `φ`, allowing nested lists and multiple fields. For example, `ls_NE φ e f` can describe a list whose nodes contain disjoint sublists; the formula `(x ↦ f:y′, g:z′) * ls_PE φ_f y′ x * ls_PE φ_g z′ x` describes two circular lists sharing a header (Section 3, pp. 388–389). The paper says nested lists and multiple lists with a common header node “are common in device drivers” (Section 3, p. 389). The experiments use this second instantiation (Section 3, p. 389).

Inference: in Verus, the closest form is a ghost heap model (maps or sequences of node records) plus `spec fn` predicates for list segments and separation. Verus does not provide a built-in separation-logic abstract interpreter; the join algorithm would be an external analyzer that emits Rust invariants and proof obligations.

## technique: partial join `⊔†` for simple lists

Use the join at program points where disjunctions would otherwise explode. Given heaps `q0=Π0∧Σ0` and `q1=Π1∧Σ1` with disjoint primed variables, compute a common heap `Σ` and witness relation `ϕ′` in two stages (Section 4.1, pp. 391–393).

1. Backward-search the rules in Figure 1 to derive `Σ0,Σ1,∅ ⊢ Σ,ϕ′,δ0,δ1`; the rules handle `emp`, `true`, a match of two points-to or list-segment predicates (or a points-to with a list segment), and two rules (PE-left, PE-right) that introduce `ls_PE` for a list present in only one input (Figure 1, p. 393; the proof search is described on p. 392)
2. Record witness triples `(e0,e1,e′)` for each existential variable in the output. Relations `δi` record the `(ei, fi)` of input list segments that were generalized to a possibly empty list (Section 4.1, p. 392)
3. Reject the candidate if the witness mapping loses sharing: for all triples `(e0,e1,e)`, `(f0,f1,f)` in `ϕ′ ∪ {(e,e,e) | e not primed}` and each `i`, if `ei = fi` and `ei ≠ 0` then `(e_{1-i}, f_{1-i})` must lie in `eq(δ_{1-i})`, the least equivalence relation containing `δ_{1-i}` (Section 4.1, p. 392). The paper's intuition is that the two heaps, viewed as graphs and with vertices identified according to the `δ`s, should be isomorphic via the witness relation (p. 392)
4. If the check succeeds, compute `Π` by retaining equalities/disequalities without primed variables that occur in both inputs, plus `x′ ≠ 0` for witness triples `(e0,e1,x′)` where `ei ≠ 0` occurs in `Πi`; return `Π ∧ Σ` (Section 4.1, p. 391). The paper motivates the `x′ ≠ 0` case by drivers that store 0 or 1 in a cell according to whether a list is empty (p. 391)

The `PE` constructor is the key controlled abstraction. The paper's malloc loop produces three states—nonempty list, one-cell list, and empty heap—and the join reduces them first to a nonempty list plus empty case, then to one `ls_PE` state (Section 4, pp. 389–390; the paper elides the `φ` parameter there). It can lose precision (the paper says “this is not always the case” that the join loses no information): joining `y↦0 * ls_NE x 0` with `ls_NE y 0 * x↦0` yields two independent nonempty lists and loses the fact that one has length exactly one (Section 4, p. 390); the paper says “it is unusual for programs to rely on this sort of disjunctive information”. The sharing check rejects merges of heaps with different shapes: for `(x ↦ y) * ls_NE y 0` and `ls_NE x 0 * (y ↦ 0)` the proof search succeeds, but the check fails because `y` in the first heap is related to both `0` (by `ϕ′`) and `y` (by default) in the second, the paper calls the failure desired because the two heaps have different shapes (Section 4.1, p. 393).

## technique: composite-structure join

For nested records and list predicates, parameterize points-to and `ls` by `φ`, and define `φ0 ⊔ φ1` by a sound theorem prover over fresh node endpoints. Figure 3 has four rules: combine multi-field points-to facts (match1); combine two list segments (match2); or, in match3 and match4, use frame inference to subtract a node predicate from one heap before joining it with a list segment (Section 4.2, pp. 393–395). `φ0 ⊔ φ1` is `φ0` if `φ1` implies `φ0`, `φ1` if `φ0` implies `φ1`, and undefined otherwise, decided by a call to a sound theorem prover (Figure 3, p. 395). The worked example joins two nested-list heaps into `ls_PE φ x y * ls_PE φ y 0` because `ψ ⊑ φ` and `φ′ ⊑ φ` (p. 394).

Inference: the theorem-prover side condition would become a Verus lemma obligation about `φ0 ⇒ φ1` or vice versa, which an analyzer emitting Verus invariants would have to generate.

## technique: selective integration in interprocedural analysis

SpaceInvader stores a set of symbolic heaps at each program point using the RHS interprocedural dataflow algorithm. Pick two states, call `⊔†`, and replace them by the result on success; return both to the set when it fails (Section 4.3, pp. 394–395). The paper restricts it, “in order to maintain precision”, to: loop heads; ends of conditionals outside loops; procedure call sites; and procedure exits. These locations control fixed-point growth, conditional path explosion, and procedure-summary size (Section 4.3, p. 395). SpaceInvader also uses join to make procedure summaries smaller, passes only the reachable portion of the heap to a procedure (locality), and aggressively discards intermediate states. The paper states that turning off any one of these three optimizations makes the analysis use more than the 2GB RAM on at least one example, causing disk thrashing and then timeout (set at 90 min) (Section 3, p. 389).

## evidence, assumptions, and what remains trusted

Table 1 evaluates seven fixed Windows/Linux drivers on an Intel Core Duo 2.0 GHz with 2 GB RAM; times are proof times for bug-fixed versions, and each reported error was manually confirmed. Results include (LOC/seconds/MB) `scull.c` 1,010 LOC/0.36 s/0.25 MB, `class.c` 1,983/8.21 s/7.62 MB, `ll_rw_blk.c` 5,469/887.94 s/485.87 MB, `md.c` 6,635/1,585.69 s/847.63 MB, and `t1394Diag.c` 10,240/135.05 s/68.81 MB. The memory-leak and dereference-error columns report errors found (for example 33 leaks and 10 dereference errors in `t1394Diag.c`), the caption says each was confirmed manually and the Windows ones by the Windows kernel team; false-error rate is 0% for all seven (Table 1, p. 386). Table 3 lists `md.c` as 6,653 LOC, against 6,635 in Table 1. These denominators are seven drivers, not a random population.

Table 2 shows postcondition-state counts for creation harnesses: `firewire_create.c` falls from 3,969 states without join/NE to 32 with join/NE and to 1 with join/PE; `twolist_create.c` falls from 9 to 4 to 1 (Table 2, p. 390). Table 3 reports all-optimization times: `class.c` 8.21 s, `pci-driver.c` 0.97 s, `cdrom.c` 103.26 s, `md.c` 1,585.69 s, and `t1394Diag.c` 135.05 s; the two columns without `⊔†` time out (90 min) on all drivers but `scull.c`. With join but NE-only lists, `ll_rw_blk.c` and `md.c` time out and `t1394Diag.c` takes 3,415.76 s versus 135.05 s with PE (Table 3, p. 396).

The analysis assumes sequential execution, array safety (array dereference returns a nondeterministic value), and usable singly-linked semantics for some drivers; the 1394 driver's pointer arrays were modified to size 1 (Section 2, p. 387). SpaceInvader implements only sequential shape analysis; the paper cites [12] for using it on resource invariants to cover concurrent drivers, and calls scalable concurrent shape analysis “an open problem” (Section 2, p. 387). The drivers run against hand-written environment code and a reusable model of system calls (Section 2, p. 387).

Inference: the abstract-domain definitions, the theorem prover for entailment (the paper mentions “a sound theorem prover”, p. 395), the environment model, and the SpaceInvader implementation remain trusted. A successful proof establishes the modeled pointer-safety property under those assumptions, not full Rust or hardware correctness.

The experimental mode is explicit: “During our experiments SpaceInvader was used in a stop-first configuration, where the analyzer halts if it cannot prove that a dereferencing operator is safe or if it cannot prove that a cell is reachable.” (Section 2, p. 387) The authors also report: “Note that, during our experiments, no false errors were found.” (Section 2, p. 387)

Inference: this poses a medium threat to agent-written verified Rust. The join strategy could reduce path explosion when generating Verus loop invariants for linked structures, but the paper's analyzer is C/separation-logic specific and predates Rust. VL should reuse selective abstraction and sharing-preservation checks, while avoiding a new generic shape analyzer unless measurements show Verus proof-state explosion.

Inference: what VL should not redo is a benchmark claim that a partial join alone proves industrial memory safety. The paper says “we do not claim that ⊔† alone is the root cause for the performance found in Table 1, but it is a critical ingredient” (Section 3, p. 389), and attributes performance to the mix of join, locality, and discarding; any Rust evaluation must report each component and its denominator.

## techniques for the catalog

- separation symbolic heaps — represent pointer structure with points-to, list segments, equalities, and separating conjunction
- sharing-preserving partial join — generalize two heaps with witness relations and reject merges that break graph isomorphism
- possibly-empty list abstraction — replace disjunctive empty/nonempty paths with one `ls_PE` predicate when safe
- composite-structure join — recursively join parameterized node shapes using frame inference and theorem-prover side conditions
- selective interprocedural joining — apply the join at loop, branch, call, and procedure-exit points with locality and state discarding

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "because some drivers store 0 or 1 to a cell, say, x, depending on whether a linked list y is empty, and subsequently, they use the contents of cell x to decide the emptiness of the list y."): read all 14 pages of the paper text and checked the abstract and Section 2 quotes, the predicate definitions, the two-stage join steps and sharing check (against the PDF image of p. 392 for the `ei ≠ 0` condition), Figure 1 and 3 rule descriptions, the program points where join is applied, and every number in Tables 1 to 3; changed the predicate definition, join steps 1 to 4, the page references for Sections 4.2 and 4.3, the list of three optimizations, the trusted-base paragraph (now marked Inference), and added Table 3 and caveat details; did not check the cited related work or the Verus remarks beyond marking them Inference; link kept from the fetch record (the paper text gives no DOI).
