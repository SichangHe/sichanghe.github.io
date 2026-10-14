# Automatic Verification of Iterated Separating Conjunctions using Symbolic Execution
(authored by agents unless marked 🧑)
Tag: `muller2016automatic`, [paper](http://arxiv.org/abs/1603.00649v3)
## scope and core idea

The paper extends the Viper verifier with automatic support for iterated separating conjunctions (ISCs). An ISC is a quantified permission assertion such as forall i: Int :: left <= i < right ==> acc(a[i]); it grants access to an unbounded set of locations. The motivating use is random access to arrays and graph nodes, where recursive predicates impose a traversal structure that the program need not follow.

The paper states: “In permission logics such as separation logic, the iterated separating conjunction is a quantifier denoting access permission to an unbounded set of heap locations.” (abstract, PDF p. 1). It presents four linked techniques: quantified symbolic heap chunks with inverse receiver functions; inhale, exhale, and permission-removal algorithms; symbolic evaluation and framing of heap-dependent expressions; and carefully controlled SMT quantifier instantiation. The implementation is an extension of Viper (abstract and section 1, PDF pp. 1–2).

Inference: for VeruLaw, these techniques matter when verified Rust code owns or shares permissions for arrays, graph edges, or other indexed resources. Verus’s ownership and specification mechanisms are different from Viper’s permission logic, so the mappings below are design inferences rather than claims that Verus already implements ISC.

## technique 1: quantified chunks and injective receiver encoding

What it is. A conventional Smallfoot symbolic heap stores one chunk per location, with receiver, field, value, and permission. For an ISC, the paper stores a quantified chunk r.f ↦ [v(r), p(r)] whose domain is every r.f for which p(r) > 0. The receiver expression e(x) must be injective on the values receiving permission. The verifier introduces an inverse function e⁻¹ and rewrites the ISC’s bound variable through that inverse, avoiding existential searches for which x maps to a receiver.

The paper’s restriction is explicit: “we require the receiver expressions e(x) in an ISC to be injective in x, for all values of x to which the ISC provides permission.” (section 3.1, PDF p. 7). The resulting chunk uses a permission function p(e⁻¹(r)) and value map v(r), with path constraints Inv-1 and Inv-2 connecting e and e⁻¹ (section 3.1, PDF pp. 7–8).

When to use it. Use this representation when a quantified resource ranges over array indices or a set of receivers and the index-to-location map is injective. It handles fractional permissions and variable permission amounts, including every nth array slot. It does not directly handle duplicate receiver mappings without an encoding that accounts for multiplicity (section 3.1, PDF p. 8).

How to implement it:
1. Normalize each ISC to forall x:T :: c(x) ==> acc(e(x).f, p(x)).
2. Check or assume that e is injective under c.
3. Introduce a fresh inverse e⁻¹ : T -> Ref.
4. Add Inv-1: for every r in the inverse domain, c(e⁻¹(r)) implies e(e⁻¹(r)) = r.
5. Add Inv-2: for every x satisfying c(x), e⁻¹(e(x)) = x.
6. Add a quantified chunk r.f ↦ [v(r), c(e⁻¹(r)) ? p(e⁻¹(r)) : 0].

The paper’s inhale rule follows exactly this sequence (Figure 2, PDF p. 7). Its array encoding maps index i to ghost object A(i), field val; inhaling a segment introduces a quantified chunk r.val ↦ [v(r), left <= a⁻¹(r) < right ? 1 : 0] (section 3.2, PDF p. 8).

Verus form. Inference: model an indexed permission set with a ghost map from indices to abstract locations and a spec fn that maps an index to a location identifier. Require injectivity as a lemma or precondition. Inference: use requires to state the index range and ownership facts, and ensures to return them; use proof fn proofs to establish inverse properties. Verus does not expose Viper heap chunks or inverse-function SMT encodings, so an implementation would be a ghost-level abstraction rather than a direct syntax translation.

Evidence and limits. The paper says the injectivity restriction does not limit arrays or set receivers when specifications are expressed appropriately, but ranges containing duplicates require set encoding or permission expressions reflecting multiplicities (section 3.1, PDF p. 8). Soundness depends on the injectivity check before inverse constraints are added (section 3.2, PDF p. 9).

## technique 2: inhale, exhale, and precise permission removal

Inhale adds permissions and pure assumptions to a symbolic state. Exhale checks that permissions and pure assertions are available, then removes them. For an ISC, inhale evaluates the condition, receiver, and permission expressions under a fresh bound constant, adds inverse constraints, and inserts a quantified chunk. Exhale performs the same preparation but first checks receiver injectivity and then calls remove.

The paper’s general permission semantics are: “Inhaling an assertion A adds the permissions denoted by A to the current state and assumes the pure assertions in A. Exhaling an assertion A checks that the current state satisfies the pure assertions in A; it also checks that the state contains the permissions denoted by A and removes them.” (section 2, PDF p. 3).

Use inhale to establish an ISC precondition or method postcondition. Use exhale at calls, writes, and returns. The remove algorithm is required when requested permissions overlap multiple quantified chunks.

How remove works (Figure 3, PDF p. 9):
1. Collect all chunks for field f.
2. Set qneeded to the requested permission function.
3. For each chunk, take qcurrent(r) = min(qi(r), qneeded(r)).
4. Subtract qcurrent from qneeded.
5. Add an updated chunk with qi(r) - qcurrent(r).
6. Check that qneeded(r) = 0 for every r; otherwise report verification failure.
7. Replace old chunks with updated chunks.

The greedy iteration is permission-precise and uses pointwise functions rather than existential quantifiers (section 3.2, PDF p. 9). In the parallel array example, two recursive calls exhale disjoint segments from one quantified chunk; after the calls, remove combines resulting chunks when exhaling the caller’s postcondition (section 3.2, PDF pp. 8–9).

Verus form. Inference: represent a resource partition as a ghost map or set and prove disjointness of subranges before recursive calls. Each call’s requires consumes a logically separate range and its ensures returns it; a parent proof fn proves that the union is restored. Inference: the pointwise min/subtraction algorithm belongs in ghost proofs or a resource algebra, not executable Rust.

Failure assumptions. Exhale assumes every inhale has a matching exhale, such as a method precondition at the call site (section 3.2, PDF p. 9). A failed final qneeded check means the state lacked a requested permission.

## technique 3: symbolic value summaries and heap-dependent evaluation

Quantified chunks carry value maps v(r). A heap may contain several chunks for a field, so the verifier lazily summarizes them before evaluating a field read. summarise creates a fresh value map v, equates v(r) with every chunk value map on that chunk’s domain, and sums permissions pointwise. The operation is memoized and does not query the SMT solver (section 4.1, PDF pp. 11–12).

For a field read e.f, eval first evaluates e, invokes summarise, checks that positive permission exists for e, and returns v(e) together with summary constraints (Figure 6, PDF p. 14). Pure quantifiers are evaluated by replacing the bound variable with a fresh constant; path conditions mentioning that constant are universally quantified on return (section 4.1, PDF p. 12).

A field write is desugared into exhale acc(e1.f), inhale acc(e1.f), and inhale e1.f == e2. This leaves the old quantified chunk with the written location removed and adds a fresh chunk for the updated location (section 4.1, PDF p. 12).

Verus form. Inference: use ghost maps of logical values keyed by abstract locations, with a spec fn lookup and lemmas that combine maps from disjoint regions. Executable writes remain ordinary Rust assignments; ensures states the updated map relation. Inference: map consistency and permission checks must be proved explicitly because Verus does not automatically summarize Viper chunks.

## technique 4: framing with partial value maps and defunctionalization

A heap-dependent function may read an unbounded set of locations through an ISC. A fixed tuple of snapshots is insufficient. The paper models each snapshot as a partial value map, represented in first-order SMT by an uninterpreted type PVM, a domain function domain_f : PVM -> Set[Ref], and apply_f : PVM × Ref -> T. An extensionality axiom establishes equality when partial maps agree on their domains (section 4.2, PDF p. 13).

At a function application, the verifier checks all ISC permissions, summarizes the current value map, creates a fresh PVM, sets its domain to the ISC domain, and assumes apply_f(pvm,r) = v(r) for every receiver in that domain. The PVM is passed as an additional snapshot argument to the SMT-level function (section 4.2, PDF pp. 13–14). This is defunctionalization: partial maps become first-order data plus apply/domain operations.

Verus form. Inference: model a snapshot as a ghost map or immutable sequence plus a domain set; pass it as a specification argument to a spec fn or proof fn. Inference: prove framing by showing equal domains and equal values at every location the function may read; this is a contract lemma, not an automatic consequence of Rust ownership.

## technique 5: quantifier-trigger control

SMT quantifiers can be incomplete, slow, or nonterminating without carefully chosen syntactic triggers. A trigger tells the solver to instantiate a quantified variable only when a matching term appears. The paper warns: “Triggers must be chosen carefully: enabling too few instantiations may cause examples to fail unexpectedly, while too many may lead to unreliable performance or even non-termination of the solver.” (section 5, PDF p. 14).

The implementation chooses triggers for value-map equality and inverse axioms. VmDefEq uses either value-map application as an alternative trigger. Inv-1 uses e⁻¹(r); Inv-2 uses a value-map application when the source receiver expression is not a legal trigger. The paired inverse axioms can generate each other’s terms, but SMT equality modulo known equalities prevents an infinite matching loop (section 5, PDF pp. 14–15).

Verus form. Inference: expose only the quantified facts needed by a proof and add targeted broadcast or lemma triggers according to the Verus proof language available in the project. Inference: do not assume that a trigger strategy transfers from Viper/Z3; measure solver behavior on the actual Verus encoding.

## technique 6: predicates with ISCs

Viper predicates integrate with ISC assertions through explicit fold and unfold operations. Folding corresponds to exhaling a predicate body and inhaling the predicate instance; unfolding does the reverse. Therefore predicates with ISCs and pure quantifiers in their bodies work naturally with the inhale/exhale rules (section 3.3, PDF p. 10). The implementation does not support predicates inside ISCs, although the paper sketches extending quantified chunks to predicate instances (section 3.3, PDF p. 10).

Verus form. Inference: represent a data-structure invariant as a predicate-like spec fn and expose or hide component facts through proof lemmas. Inference: recursive predicate unfolding must be bounded by explicit lemmas and termination arguments; the paper’s unimplemented predicate-inside-ISC feature is future work.

## evidence, trusted parts, and limits

Evaluation used nine hand-coded array/graph problems, 65 VerCors-generated GPU-verification examples, and 82 regression tests, on an Intel Core i7-4770 3.40 GHz with 16 GB RAM and Windows 7 x64; reported times average 10 runs (section 6, PDF p. 15). The base implementation verified every example in a few seconds. Without memoization, runtimes generally increased modestly. Without the paper’s triggers, 11 of 156 original programs (7%) failed spuriously; the longest base example averaged 11.82 s versus 3 s without triggers, but the trigger-free version wrongly failed, and its longest example had 4.71 s standard deviation (section 6, PDF pp. 15–16). These denominators and settings are the paper’s complete 9 + 65 + 82 evaluation population and the stated machine.

Trusted components are the Viper symbolic-execution implementation, SMT solver soundness and behavior, the injectivity premise, inverse-function axioms, extensionality axioms, and source specifications. The technique supports fractional permissions and graph predicates, but nested ISCs and predicates inside ISCs are outside implemented scope (sections 3.1 and 3.3, PDF pp. 8 and 10).

Inference: the product threat for agent-written verified Rust is concentrated in resource specifications. If an agent incorrectly states the set of locations covered by an array or graph invariant, Verus can prove the wrong ownership contract. The paper’s reusable ideas are a canonical quantified-resource representation, precise split/recombine accounting, explicit heap-dependent snapshots, and solver-context controls. Existing Viper work already implements these for permission logic; VL should test whether a simpler Verus ghost-map encoding preserves the same guarantees and performance before building a new verifier subsystem.

## techniques for the catalog

- quantified permission chunks — represent an unbounded ISC with a receiver-indexed value map and permission function under an injective receiver condition
- inhale and exhale — add, check, and remove quantified permissions using inverse constraints and exact permission accounting
- remove — greedily subtract requested permissions across all matching chunks and require zero residual demand
- value-map summarise — combine value and permission maps from all chunks for a field before symbolic evaluation
- partial snapshots — frame heap-dependent functions with first-order partial value maps and defunctionalized apply/domain operations
- trigger control — choose SMT quantifier triggers to avoid spurious failures, unpredictable search, and matching loops
- predicate integration — fold and unfold predicate instances through the same inhale/exhale machinery used for ISCs
Checked 2026-10-13: audit record muller2016automatic; paper-study comparison complete; gate executed; experiments not rerun
