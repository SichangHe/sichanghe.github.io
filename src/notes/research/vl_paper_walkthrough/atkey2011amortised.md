# Amortised Resource Analysis with Separation Logic
(authored by agents unless marked 🧑)
Tag: `atkey2011amortised`, [paper](https://doi.org/10.2168/LMCS-7%282:17%292011) (DOI from the paper text; LMCS vol. 7 (2:17), 2011, pp. 1–33)

## scope and proved claims
Atkey embeds consumable resources into separation logic for imperative pointer programs. The abstract reports: “We present the logic on a small imperative language, based on Java bytecode, with procedures and mutable heap” (p. 1). The heap assertion gives shape and ownership; a resource assertion gives credits that commands consume. The abstract says the logic and its soundness are formalised in Coq and a certified verification-condition generator (VCG) is extracted (abstract, p. 1; Sec. 5.2, p. 25). Its proof-search procedure emits linear constraints that a linear solver uses to infer resource annotations (Sec. 5.3, p. 28).

The core soundness claim is a bound: for every state, the resource consumed plus the resource available in the future is at most a predefined bound (Sec. 1, p. 2; formally Thm. 3.3, p. 16). The paper's resource-carrying list predicate associates an amount R of resource with each node, so in the functional-queue example a reversal is paid for by credits deposited during enqueue (Sec. 2.1, pp. 4–5). This is amortised analysis attached to heap shape rather than a global counter.

## technique: resource-carrying separation predicates
Use this when cost depends on mutable structure shape and local reasoning should hide representation sizes from clients.

1. Define consumable resources as an ordered commutative monoid and combine heaps and resources with a ternary separation relation on (heap, resource) pairs (Sec. 1, p. 2; Sec. 3.1, pp. 9–10).
2. Extend an inductive list segment with a resource parameter `R`; each nonempty node owns its points-to cells plus `R` and a recursive segment (Sec. 1, p. 2).
3. Split heap and credits with separation when opening the head; mutate or consume the head piece while framing the tail (Sec. 1, p. 2).
4. State a global bound by requiring that, in every state, the resource consumed plus the resource available for future consumption is at most a predefined bound (Sec. 1, p. 2; Sec. 3.5, p. 16).

The paper says, “By the definition of lseg, we know that the amount of resource available to the program is linearly proportional to the length of the list” (Sec. 1, p. 3). In the functional-queue example, put resource on every tail-list node; enqueue requires two units (one for the operation and one stored for reversal), while dequeue requires one (Sec. 2.1, pp. 4–5).

Inference: Verus can represent the shape predicate as a recursive `spec fn` over an abstract sequence/map and resource as an integer or nonnegative ghost field. Ownership and mutable references remain Rust's responsibility; Verus has no built-in separation-logic resource monoid, so one must prove split/combine lemmas and thread a ghost credit variable through `requires`, `ensures`, and loop `invariant` clauses. The paper's `consume` instruction becomes a ghost decrement checked by an invariant.

## technique: infer resource annotations with proof search and linear programming
Use this when loop invariants describe only heap shape and the credit coefficients are unknown.

1. Restrict assertions to a fragment that forbids arbitrary nesting of additive and separating conjunctions and negative occurrences of implication, which the paper says makes proof search practical: data (dis)equalities, points-to and list-segment heap assertions, and linear expressions over resource meta-variables (Sec. 5.1, pp. 23–24).
2. Generate VCs per procedure by computing weakest liberal preconditions backwards from the last instruction; targets of backward jumps must carry loop invariants in the restricted form. The generator is formalised in Coq, proved sound against the program logic, and extracted (Sec. 5.2, pp. 24–25).
3. Run goal-directed proof search. Heap matching splits points-to and list segments; resource matching subtracts demanded credit and emits a linear inequality; contradiction rules derive pointer disequalities and non-null facts; unfolding rules branch on empty/nonempty segments; the search follows the I/O interpretation of Cervesato, Hodas and Pfenning (Sec. 5.3, pp. 25–28).
4. Saturate context by repeatedly applying contradiction and unfolding rules, then reduce the goal and repeat (Sec. 5.3, pp. 27–28).
5. Send the generated constraints, the constraint that every variable is positive, and an objective that attempts to minimise variables in the precondition to a linear solver (Sec. 5.3, p. 28; the solver is called an “integer linear program solver” on p. 25).

Of resource matching the paper says “to match a resource we subtract the desired resource from the available resources and add a constraint to ensure that there was enough resource to do this” (Sec. 5.3, p. 26). Theorem 5.1 states that the proof search terminates and is sound: if a valuation of the resource variables satisfies the generated constraints, the entailment holds under that valuation (p. 28).

Inference: in Verus, write the shape invariant explicitly and let an external linear program choose coefficients before inserting them as integer ghost constants. Verus would then check each chosen coefficient with `assert`/`lemma` proofs; it does not run this proof-search engine.

## technique: cyclic-list termination and phase invariants
Use this for in-place algorithms traversing a cyclic “frying pan” list. Describe the handle and pan with two resource-annotated list segments joined at a cell `v1.next`, plus an extra resource variable; use a disjunctive loop invariant with three disjuncts, one per phase of the reversal (Sec. 6.2, pp. 29–30). The paper's example assumes one element of resource per node reversed. The tool infers precondition annotations x1 = 2 (handle), x2 = 1 (pan) and x3 = 2 (extra resource), and the postcondition annotations are all 0; the paper explains that each handle node carries 2 units for the two passes over the handle and each pan node carries 1 (Sec. 6.2, p. 30). The paper adds a `consume` instruction executed every time the procedure starts a loop, so the inference also verifies termination and bounds the loop count by the input shape (Sec. 6.2, p. 30).

Inference: Verus needs a well-founded integer variant in addition to the ghost credit invariant; cyclic heap shape requires an explicit finite abstraction (for example, a visited-count relation), because Verus's ordinary recursive sequence predicates do not by themselves justify pointer cycles.

## evidence, trust, limitations, and product relevance
The small-example table reports one-core times on an 8-core Intel Core i7 860 running 64-bit Ubuntu Linux 10.10: iterate list 0.010 s, queue 0.019 s, frying pan 0.018 s, mergesort 0.037 s, and six other examples between 0.010 and 0.014 s (Sec. 6.1, pp. 28–29). These are ten examples, not a scalability study; the authors say the VC-generate-and-solve process is “not scalable in general due to the potential for exponential blow-up” in formula size (Sec. 6.1, p. 29) and that scaling to real-world code “remains to be seen”. The paper states the automated procedure supports only bounds linear in list sizes mentioned in preconditions (Sec. 7, p. 31). Inference: the trusted pieces would be Coq's kernel, the extracted VCG, the proof search (the paper states Theorem 5.1 but does not say it is mechanised in Coq), the linear solver's returned valuation, and the semantic model. Inference: for agent-written verified Rust, this technique is a medium threat to manual cost proofs and can expose denial-of-service/resource bugs, but it does not remove the need to model ownership, unsafe code, or non-linear costs.

## techniques for the catalog
- resource-carrying predicates: attach consumable credits to each owned heap fragment so local separation frames both shape and budget
- proof-search inference: generate heap/resource matching constraints and solve their linear inequalities automatically
- amortised queue specification: deposit credits on tail nodes so reversal cost is paid without exposing list lengths
- cyclic-phase termination: use disjunctive phase invariants and per-iteration consumption to infer bounds for cyclic traversal
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Note how the safeStack predicate divides up the heap and consumable resource between the activation frames on the call stack"): I read the whole paper text (pp. 1–33, including the examples, Figures 1–11 and references) and checked every quotation, the abstract and contributions claims, the page and section references, the queue and frying-pan numbers, the timing table (ten rows, hardware, single core) and the proof-search steps; I changed the link to the DOI printed in the paper (the earlier arXiv link is not in the paper text), corrected the resource-matching quote and its page (p. 26, not p. 27), the Sec. 5.1 and 5.2 page ranges, the monoid and soundness references (Sec. 3.1 and 3.5, Thm. 3.3), removed the unsupported word "decidable", the unsupported "run-time proof function" remark and the unsupported trust claims (now marked Inference); I did not check the Coq development, the Hofmann-Jost, Hoffmann-Hofmann or Berdine et al. papers, or the Verus inferences, which are my own and untested. The mid-paper quote is on p. 16 of the paper.
