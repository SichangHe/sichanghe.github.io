# PAT: Towards Flexible Verification under Fairness
(authored by agents unless marked 🧑)
Tag: `sun2009pat`, [paper](https://doi.org/10.1007/978-3-642-02658-4_59)

## scope and result
PAT is a toolkit and unified on-the-fly algorithm for checking LTL properties over finite labeled transition systems under several fairness constraints. The paper's core reduction is feasibility: search for a fair infinite loop, represented by a strongly connected component (SCC), while pruning states that cannot belong to a fair SCC. The paper says the algorithm handles a variety of fairness by modifying `prune`: “By simply modifying function prune, the algorithm can be used to handle a variety of fairness.” (Section 3, p. 712). It defines `prune` for weak, strong local and strong global fairness; for action-annotated fairness it says only that the algorithm applies “with small modifications” (p. 713).

The paper defines a system as an LTS `(S, init, →)` and an execution as an infinite alternating state/action sequence (Section 2, p. 710). It summarizes its contribution as: “A unified algorithm is proposed to model check systems with a variety of fairness effectively in two different settings.” (abstract, p. 709). It warns that “Without fairness, verification of liveness properties often produces unrealistic loops during which one process or event is unfairly favored.” (Section 1, p. 709). Inference: this is directly relevant to a verified Rust scheduler model when liveness claims depend on scheduling assumptions; the fairness assumption must be explicit in the specification.

## technique 1: SCC feasibility under fairness

What it is. For a finite system, a fair execution exists iff there is a loop satisfying the fairness condition. PAT therefore searches SCCs on the fly, pruning unfair states and recursively checking remaining SCCs (Section 3, pp. 711–712). The paper gives this procedure:

```
feasible(S,T)
 while unvisited states remain:
   scc := findSCC(S,T)
   pruned := prune(scc,T)
   if pruned = scc: generate a feasible path; return true
   if feasible(pruned,T): return true
 return false
```

How to apply it.
1. Build or expose a finite LTS for the system and the negation of the target property (Section 3, p. 711).
2. Explore one SCC with Tarjan's `findSCC`; the implementation may discover states and transitions on the fly (p. 712).
3. Apply the fairness-specific `prune` function.
4. If no state was pruned, construct a loop through the SCC and return a fair execution; otherwise recurse on the remaining SCC and continue with other SCCs (p. 712).
5. For model checking, take the product of the system and the negated property, so a fair counterexample is a fair loop in that product (p. 711).

The paper states: “The basic idea is to identify one SCC at a time and then check whether it is fair or not.” (Section 3, p. 711). Weak fairness uses `always(scc) ⊆ engaged(scc)`; if an always-enabled event is never engaged, prune the whole SCC. Strong local fairness is defined through `once(scc) ⊆ engaged(scc)`; the paper says “A state is pruned if and only if there is an event enabled at this state but never engaged in scc.” (p. 712). Strong global fairness removes all states if some transition from an SCC state leads to a state outside the SCC, and keeps the SCC otherwise (p. 712). Here `always(scc)` is the set of events enabled at every state of the SCC, `once(scc)` the set enabled at one or more states, and `engaged(scc)` the set of events labeling a transition between two states of the SCC.

Verus form. Inference: represent a finite-state transition relation as a `spec fn` over an enum state and event, and encode a bounded SCC witness as a sequence with a repeated state. Prove fairness predicates over the sequence with quantified specifications and loop `invariant`s; prove that a returned cycle satisfies the chosen fairness condition. Verus does not execute Tarjan's search as a proof automatically; an external search can emit a certificate that Verus checks. Use `ensures` on proof functions and `requires` for finite-domain and transition-witness assumptions.

Evidence. PAT's experiments run PAT 2.2 and SPIN 4.3 on a Core 2 2.40 GHz CPU with 2 GB RAM (Section 3, pp. 713–714). The table reports one number per model/property/size and fairness setting; the paper does not state the unit or whether a value is a single run or an average. Inference: the values are probably seconds. For example, complete-network leader election size 8 takes PAT 726.6 s under weak fairness, 739.0 s under strong local fairness, and 673.1 s under strong global fairness; the corresponding SPIN weak-fairness value is 5720 s. These are individual benchmark instances. The paper says “SPIN has no support for strong local or global fairness”, so SPIN has no strong-fairness columns. Dashes in the table mark entries with no value (PAT strong global for LE OR size 5 and LE R size 6; SPIN for peterson size 5); the paper does not say why. The authors write that “previously unknown bugs in implementation of LE OR [6] have been revealed using PAT” (p. 714); LE OR is the leader election for odd sized rings, and the paper says that algorithm requires strong global fairness.

Limits and trust. The paper assumes a finite-state model “Without loss of generality” (p. 711). Inference: the algorithm relies on SCC decomposition and fairness-specific pruning being sound. The strong-global rule is all-or-nothing for an SCC: the paper argues that if one transition leaves the SCC, no subgraph can be strong global fair (p. 712). The paper says “The soundness of the algorithm and a discussion on its complexity is discusssed in [10]”, a technical report (Section 3, p. 711); the paper itself gives no soundness proof. Inference: a Verus proof must trust the model's transition relation and the correspondence between an externally found SCC and the Rust implementation; a proof of one bounded cycle does not establish unbounded liveness.

## technique 2: action-annotated fairness

What it is. Instead of imposing fairness on every action/state, annotate selected actions with unconditional `f(a)`, weak `wf(a)`, or strong `sf(a)` fairness (Section 3, p. 713). Unconditional fairness requires the action to occur infinitely often; weak (strong) action fairness requires it to occur infinitely often if it is always (once) enabled. The paper's motivations are that fairness is then applied only to chosen actions, and that “it remains possible to apply partial order reduction to actions which are irrelevant to the fairness annotations.”

How to apply it. The paper says only that “The algorithm can then be applied to check systems with action annotated fairness with small modifications.” (p. 713). Inference: mark only scheduler or protocol events whose fairness is required; define the corresponding enabled/engaged tests; modify `prune` to inspect those annotations; run the same SCC recursion. The paper's clock example is `Clock () = f (tick){x = x + 1} → Clock ()` (p. 713); the paper says annotating `tick` requires “that the clock must progress infinitely and the system disallows unrealistic timelock, i.e., execution of infinite actions which takes finite time.”

Verus form. Inference: add a ghost counter or rank for annotated events and prove that every infinite execution satisfying the fairness assumption has unbounded event occurrences. For finite verification, check the cycle certificate against the event annotation. The annotation itself is a trusted modeling assumption unless separately proved from scheduler code.

## what is proved, measured, and trusted

The paper establishes the unified algorithm and gives benchmark measurements; it does not provide a Verus proof or a quantitative confidence interval. Its table's “Yes/No” values are property outcomes, while the timing columns are on the stated hardware (unit not stated; see above). It reports that all listed algorithms fail without fairness; LE C and Peterson require at least weak fairness, while the other listed protocols require strong global fairness (p. 714). Inference: VL should model fairness contracts explicitly and can reuse SCC/certificate checking, but should not redo PAT's algorithmic contribution. The product threat is a false liveness claim caused by an unstated or unproved scheduler fairness assumption.

## techniques for the catalog

- fair-SCC search — find SCCs on the fly and recursively prune states until a fair loop or exhaustion is proved
- fairness-specific pruning — implement weak, strong-local, and strong-global fairness by changing the SCC pruning predicate
- action-annotated fairness — attach `f`, `wf`, or `sf` constraints only to selected actions so partial order reduction stays possible for the other actions
- product counterexample checking — search fair loops in the product of the system and negated property
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "If there exists an event e which is always enabled but never engaged, by definition scc does not satisfy weak fairness."): read all 6 pages of the text (pp. 709-714, with references); checked every quotation, the Definitions 1-3 and prune summaries, the pseudocode, section and page references, the table numbers quoted (leader election size 8 values and the 5720 SPIN value), the hardware and tool versions, and the claims about what the paper says on soundness [10]; changed the claim that PAT handles all variants by changing only `prune` (the paper says that for the three fairness kinds, and "small modifications" for action annotations), the unstated table unit "seconds"/"wall-clock" and the "not averages" claim, "eventually enabled" (paper: always/once), "soundness proof" (paper: soundness is discussed in a technical report), the "intentionally" and partial-order-reduction wording, and marked own conclusions as Inference; the link (DOI) is not in the paper text, link from the fetch record; did not check the cited technical report [10] or other references, the PDF layout beyond the text, or any Verus-related inference, which is the study author's own.
