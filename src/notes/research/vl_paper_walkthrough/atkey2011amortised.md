# Amortised Resource Analysis with Separation Logic
(authored by agents unless marked 🧑)
Tag: `atkey2011amortised`, [paper](http://arxiv.org/abs/1104.1998v2)

## scope and proved claims
Atkey embeds consumable resources into separation logic for imperative pointer programs. The abstract reports: “We present the logic on a small imperative language, based on Java bytecode, with procedures and mutable heap” (p. 1). The heap assertion gives shape and ownership; a resource assertion gives credits that commands consume. The paper formalises the logic and soundness in Coq and extracts a certified verification-condition generator (VCG) (Sec. 1, p. 1). Its proof-search procedure emits linear constraints and uses linear programming to infer resource annotations.

The core soundness claim is a bound: consumed resource plus remaining resource is at most the predefined initial bound (Sec. 1, p. 2). The paper's resource-carrying list predicate associates one resource unit with each node, so a reversal can be paid for by credits deposited during enqueue. This is amortised analysis attached to heap shape rather than a global counter.

## technique: resource-carrying separation predicates
Use this when cost depends on mutable structure shape and local reasoning should hide representation sizes from clients.

1. Define a consumable-resource monoid and a separating conjunction for heap and resource pieces (Sec. 1, pp. 1–2).
2. Extend an inductive list segment with a resource parameter `R`; each nonempty node owns its points-to cells plus `R` and a recursive segment (Sec. 1, p. 2).
3. Split heap and credits with separation when opening the head; mutate or consume the head piece while framing the tail (Sec. 1, p. 2).
4. State a global bound by requiring consumed plus available credits to remain below the procedure's budget (Sec. 1, p. 2).

The paper says, “By the definition of lseg, we know that the amount of resource available to the program is linearly proportional to the length of the list” (Sec. 1, p. 3). In the functional-queue example, put resource on every tail-list node; enqueue requires two units (one for the operation and one stored for reversal), while dequeue requires one (Sec. 2.1, pp. 4–5).

Inference: Verus can represent the shape predicate as a recursive `spec fn` over an abstract sequence/map and resource as an integer or nonnegative ghost field. Ownership and mutable references remain Rust's responsibility; Verus has no built-in separation-logic resource monoid, so one must prove split/combine lemmas and thread a ghost credit variable through `requires`, `ensures`, and loop `invariant` clauses. The paper's `consume` instruction becomes a ghost decrement checked by an invariant.

## technique: infer resource annotations with proof search and linear programming
Use this when loop invariants describe only heap shape and the credit coefficients are unknown.

1. Restrict assertions to the decidable fragment: points-to, inductive segments, Boolean/affine bunched implications, and linear resource expressions (Sec. 5.1, pp. 23–25).
2. Generate VCs by weakest-liberal-precondition rules. The generator is extracted from a Coq soundness proof (Sec. 5.2, p. 25).
3. Run goal-directed proof search. Heap matching splits points-to and list segments; resource matching subtracts demanded credit and emits a linear inequality; contradiction rules derive pointer disequalities and non-null facts; unfolding rules branch on empty/nonempty segments (Sec. 5.3, pp. 25–28).
4. Saturate context by repeatedly applying contradiction and unfolding rules, then reduce the goal and repeat (Sec. 5.3, pp. 27–28).
5. Send generated constraints, positivity constraints, and an objective minimizing precondition variables to an integer linear solver (Sec. 5.3, p. 28).

The resource-matching rule “subtract[s] the desired resource from the available resources and add[s] a constraint to ensure that there was enough resource” (Sec. 5.3, p. 27). Theorem 5.1 states termination and soundness whenever a valuation satisfies the generated constraints (p. 28).

Inference: in Verus, write the shape invariant explicitly and let an external linear program choose coefficients before inserting them as integer ghost constants. Verus then checks each chosen coefficient with `assert`/`lemma` proofs; it does not run this proof-search engine or permit a run-time proof function.

## technique: cyclic-list termination and phase invariants
Use this for in-place algorithms traversing a cyclic “frying pan” list. Describe the handle and pan with two recursive segments and an unknown resource coefficient; use a disjunctive loop invariant with one disjunct per traversal phase (Sec. 6.2, pp. 29–30). The tool infers coefficients `2` for handle nodes and `1` for pan nodes, then all postcondition resources become zero (Sec. 6.2, p. 30). A `consume` at each loop iteration turns the resource bound into a termination bound.

Inference: Verus needs a well-founded integer variant in addition to the ghost credit invariant; cyclic heap shape requires an explicit finite abstraction (for example, a visited-count relation), because Verus's ordinary recursive sequence predicates do not by themselves justify pointer cycles.

## evidence, trust, limitations, and product relevance
The small-example table reports one-core times on an 8-core Intel Core i7 860 running 64-bit Ubuntu Linux 10.10: iterate list 0.010 s, queue 0.019 s, frying pan 0.018 s, mergesort 0.037 s, and six other examples between 0.010 and 0.014 s (Sec. 6.1, p. 29). These are ten examples, not a scalability study; the authors warn of exponential VC growth. The paper states the automated procedure supports only bounds linear in list sizes mentioned in preconditions (Sec. 7, p. 31). Trusted pieces are Coq's kernel, the extracted VCG, the linear solver's returned valuation, and the semantic model; the implementation of the solver is not proved in Coq. Inference: for agent-written verified Rust, this technique is a medium threat to manual cost proofs and can expose denial-of-service/resource bugs, but it does not remove the need to model ownership, unsafe code, or non-linear costs.

## techniques for the catalog
- resource-carrying predicates: attach consumable credits to each owned heap fragment so local separation frames both shape and budget
- proof-search inference: generate heap/resource matching constraints and solve their linear inequalities automatically
- amortised queue specification: deposit credits on tail nodes so reversal cost is paid without exposing list lengths
- cyclic-phase termination: use disjunctive phase invariants and per-iteration consumption to infer bounds for cyclic traversal
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
