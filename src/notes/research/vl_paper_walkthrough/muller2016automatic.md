# Automatic Verification of Iterated Separating Conjunctions using Symbolic Execution
(authored by agents unless marked 🧑)
Tag: `muller2016automatic`, [paper](http://arxiv.org/abs/1603.00649v3)
## scope and core idea

The paper extends the Viper verifier with automatic support for iterated separating conjunctions (ISCs). An ISC is a quantifier over access permissions, such as forall i: Int :: left <= i < right ==> acc(a[i]) (Figure 1, PDF p. 5); it grants access to an unbounded set of locations. The motivating use is random access to arrays and graph nodes, where recursive predicates impose a traversal structure that the program need not follow.

The paper states: “In permission logics such as separation logic, the iterated separating conjunction is a quantifier denoting access permission to an unbounded set of heap locations.” (abstract, PDF p. 1). The paper lists its main contributions as: “(1) a novel representation of the partial heaps that are denoted by an ISC, along with algorithms to manipulate this representation; (2) a technique to preserve across heap changes (to frame) the values of expressions that depend on the unbounded set of heap locations denoted by ISCs; (3) an SMT encoding that carefully controls quantifier instantiations; (4) an implementation of our approach in the Viper verification infrastructure [14].” (section 1, PDF p. 2). This study splits them into the technique sections below: quantified chunks with inverse receiver functions; inhale, exhale, and permission removal; symbolic evaluation of heap reads; framing with partial value maps; trigger control; and predicates. The implementation is an extension of Viper (abstract and section 1, PDF pp. 1–2).

Inference: for VeruLaw, these techniques matter when verified Rust code owns or shares permissions for arrays, graph edges, or other indexed resources. Verus’s ownership and specification mechanisms are different from Viper’s permission logic, so the mappings below are design inferences rather than claims that Verus already implements ISC.

## technique 1: quantified chunks and injective receiver encoding

What it is. A conventional Smallfoot symbolic heap stores one chunk per location, with receiver, field, value, and permission. For an ISC, the paper stores a quantified chunk r.f ↦ [v(r), p(r)] whose domain is every r.f for which p(r) > 0. The receiver expression e(x) must be injective on the values receiving permission. The verifier introduces an inverse function e⁻¹ and rewrites the ISC’s bound variable through that inverse, avoiding existential searches for which x maps to a receiver.

The paper’s restriction is explicit: “we require the receiver expressions e(x) in an ISC to be injective in x, for all values of x to which the ISC provides permission.” (section 3.1, PDF p. 6). The resulting chunk uses a permission function p(e⁻¹(r)) and value map v(r) (section 3.1, PDF pp. 6–7), with path constraints Inv-1 and Inv-2 connecting e and e⁻¹ (Figure 2, PDF p. 7; section 3.2, PDF p. 8).

When to use it. Use this representation when a quantified resource ranges over array indices or a set of receivers and the index-to-location map is injective. The paper says the permission expression p(x) “need not evaluate to the same value for each instantiation of x”, which models, for example, non-zero permission to every nth slot of an array (section 3, PDF p. 6). Ranges that may contain duplicates must be encoded by mapping them to a set or by permission expressions that reflect multiplicities (section 3.1, PDF p. 8).

How to implement it:
1. Normalize each ISC to forall x:T :: c(x) ==> acc(e(x).f, p(x)).
2. Check that e is injective under c (the paper’s exhale rule performs this check; its inhale rule does not, and relies on a matching exhale).
3. Introduce a fresh inverse e⁻¹ : T -> Ref.
4. Add Inv-1: for every reference r, c(e⁻¹(r)) implies e(e⁻¹(r)) = r.
5. Add Inv-2: for every x satisfying c(x), e⁻¹(e(x)) = x.
6. Add a quantified chunk r.f ↦ [v(r), c(e⁻¹(r)) ? p(e⁻¹(r)) : 0].

The paper’s inhale rule follows this sequence, minus the injectivity check (Figure 2, PDF p. 7). Its array encoding maps index i to ghost object A(i), field val; inhaling a segment introduces a quantified chunk r.val ↦ [v(r), left <= a⁻¹(r) < right ? 1 : 0] (section 3.2, PDF p. 8).

Verus form. Inference: model an indexed permission set with a ghost map from indices to abstract locations and a spec fn that maps an index to a location identifier. Require injectivity as a lemma or precondition. Inference: use requires to state the index range and ownership facts, and ensures to return them; use proof fn proofs to establish inverse properties. Inference: Verus does not expose Viper heap chunks or inverse-function SMT encodings, so an implementation would be a ghost-level abstraction rather than a direct syntax translation.

Evidence and limits. The paper says the injectivity restriction “does not limit the data structures that can be handled by our technique, provided specifications are expressed appropriately”, and that ranges over array indices or elements of a set naturally satisfy it (section 3.1, PDF p. 8). It states that the injectivity check in exhale “guarantees that the introduced inverse functions exist and satisfy the constraints added to the path conditions, which is required for soundness” (section 3.2, PDF p. 8).

## technique 2: inhale, exhale, and precise permission removal

Inhale adds permissions and pure assumptions to a symbolic state. Exhale checks that permissions and pure assertions are available, then removes them. For an ISC, inhale evaluates the condition, receiver, and permission expressions under a fresh bound constant, adds inverse constraints, and inserts a quantified chunk. Exhale performs the same evaluation, additionally checks receiver injectivity before introducing the inverse function, and then calls remove.

The paper’s general permission semantics are: “Inhaling an assertion A adds the permissions denoted by A to the current state and assumes the pure assertions in A. Exhaling an assertion A checks that the current state satisfies the pure assertions in A; it also checks that the state contains the permissions denoted by A and removes them.” (section 2, PDF p. 3).

The paper encodes a method call “by exhaling the method precondition and then inhaling its postcondition” (section 2, PDF p. 3), and a field write as exhale, inhale, inhale (section 4.1, PDF p. 12). Removing permissions “may involve updates to many existing quantified chunks in the symbolic state”, which is why exhale delegates to remove (section 3.2, PDF p. 8).

How remove works (Figure 3, PDF p. 9):
1. Collect all chunks for field f.
2. Set qneeded to the requested permission function.
3. For each chunk, take qcurrent(r) = min(qi(r), qneeded(r)).
4. Subtract qcurrent from qneeded.
5. Add an updated chunk with qi(r) - qcurrent(r).
6. Check that qneeded(r) = 0 for every r; remove fails with a verification error if the heap lacks the requested permissions.
7. Return the heap with the old chunks for f replaced by the updated chunks.

The greedy iteration is permission-precise and uses pointwise functions rather than existential quantifiers (section 3.2, PDF p. 9). In the parallel array example, the second precondition is exhaled before each recursive call, taking each segment from the single quantified chunk; when the postcondition is exhaled at the end of the method body, remove iterates over the two quantified chunks yielded by the recursive calls (section 3.2, PDF p. 9).

Verus form. Inference: represent a resource partition as a ghost map or set and prove disjointness of subranges before recursive calls. Each call’s requires consumes a logically separate range and its ensures returns it; a parent proof fn proves that the union is restored. Inference: the pointwise min/subtraction algorithm belongs in ghost proofs or a resource algebra, not executable Rust.

Failure assumptions. The paper assumes that “each inhale operation has a corresponding exhale”, for example inhaling a method precondition at the start of the body corresponds to exhaling it at the call site (section 3.2, PDF pp. 8–9). A failed final qneeded check means the state lacked a requested permission.

## technique 3: symbolic value summaries and heap-dependent evaluation

Quantified chunks carry value maps v(r). A heap may contain several chunks for a field, so the verifier lazily summarizes them before evaluating a field read. summarise creates a fresh value map v, equates v(r) with every chunk value map on that chunk’s domain, and sums permissions pointwise. Summarisation is done lazily before evaluating e.f (PDF p. 11); it does not depend on path conditions, can be computed without querying the SMT solver, and the implementation memoizes it (section 4.1, PDF pp. 11–12; Figure 5, PDF p. 11).

For a field read e.f, eval first evaluates e, invokes summarise, checks that positive permission exists for e, and returns v(e) together with the summary constraints (Figure 6, PDF p. 13). Pure quantifiers are evaluated by replacing the bound variable with a fresh constant; path conditions mentioning that constant are universally quantified on return (section 4.1, PDF p. 12).

A field write is desugared into exhale acc(e1.f), inhale acc(e1.f), and inhale e1.f == e2. This leaves the old quantified chunk with the written location removed and adds a fresh chunk for the updated location (section 4.1, PDF p. 12).

Verus form. Inference: use ghost maps of logical values keyed by abstract locations, with a spec fn lookup and lemmas that combine maps from disjoint regions. Executable writes remain ordinary Rust assignments; ensures states the updated map relation. Inference: map consistency and permission checks must be proved explicitly because Verus does not automatically summarize Viper chunks.

## technique 4: framing with partial value maps and defunctionalization

A heap-dependent function may read an unbounded set of locations through an ISC. A fixed tuple of snapshots is insufficient. The paper models each snapshot as a partial value map, represented in first-order SMT by an uninterpreted type PVM, a domain function domain_f : PVM -> Set[Ref], and apply_f : PVM × Ref -> T. An extensionality axiom lets the solver prove two partial value maps equal (section 4.2, PDF p. 13); per Figure 10 (appendix, PDF p. 19) it requires equal domains and equal values on the domain.

At a function application, the verifier checks all ISC permissions, summarizes the current value map, creates a fresh PVM, sets its domain to the ISC domain, and assumes apply_f(pvm,r) = v(r) for every receiver in that domain. The PVM is passed as an additional snapshot argument to the SMT-level function (section 4.2, PDF pp. 13–14). This is defunctionalization: partial maps become first-order data plus apply/domain operations.

Verus form. Inference: model a snapshot as a ghost map or immutable sequence plus a domain set; pass it as a specification argument to a spec fn or proof fn. Inference: prove framing by showing equal domains and equal values at every location the function may read; this is a contract lemma, not an automatic consequence of Rust ownership.

## technique 5: quantifier-trigger control

SMT quantifiers can be incomplete, slow, or nonterminating without carefully chosen syntactic triggers. A trigger tells the solver to instantiate a quantified variable only when a matching term appears. The paper warns: “Triggers must be chosen carefully: enabling too few instantiations may cause examples to fail unexpectedly, while too many may lead to unreliable performance or even non-termination of the solver (see also Sec. 6).” (section 5, PDF p. 14).

The implementation chooses triggers for all generated quantifiers; Figure 7 (PDF p. 14) shows three. VmDefEq has two alternative triggers, v(r) and v_i(r). Inv-1 uses e⁻¹(r); Inv-2 uses e(x) in Figure 7, but since e comes from the source program it may not be a legal trigger (a trigger needs a function application and no built-in operators). The paper then says it uses v(x), the chunk’s value map, as a trigger, or else leaves trigger selection to the underlying tools, “which may lead to incompleteness”, though “we did not observe any such incompletenesses in our experiments” (section 5, PDF pp. 14–15). Which of the two cases applies where is not fully spelled out in the paper text. The paired inverse axioms can generate each other’s terms, but SMT equality modulo known equalities prevents an infinite matching loop (section 5, PDF pp. 14–15).

Verus form. Inference: expose only the quantified facts needed by a proof and add targeted broadcast or lemma triggers according to the Verus proof language available in the project. Inference: do not assume that a trigger strategy transfers from Viper/Z3; measure solver behavior on the actual Verus encoding.

## technique 6: predicates with ISCs

Viper predicates integrate with ISC assertions through explicit fold and unfold operations. Folding corresponds to exhaling a predicate body and inhaling the predicate instance; unfolding does the reverse. Therefore predicates with ISCs and pure quantifiers in their bodies work naturally with the inhale/exhale rules (section 3.3, PDF p. 10). The implementation does not yet support predicates inside ISCs, although the paper says its technique “extends straightforwardly” and sketches how (section 3.3, PDF p. 10).

Verus form. Inference: represent a data-structure invariant as a predicate-like spec fn and expose or hide component facts through proof lemmas. Inference: recursive predicate unfolding must be bounded by explicit lemmas and termination arguments; the paper’s unimplemented predicate-inside-ISC feature is future work.

## evidence, trusted parts, and limits

Evaluation used 9 hand-coded array/graph problems, 65 examples generated by the VerCors project for GPU verification, and 82 additional regression tests, on an Intel Core i7-4770 3.40GHz with 16GB RAM running Windows 7 x64 with an SSD; reported times are averaged over 10 runs, with “negligible standard deviations”, excluding JVM start-up (section 6, PDF pp. 15–16). The paper says “all examples verify in a few seconds”, but its own Figure 9 lists a maximum of 11.81 s for the VerCors set (PDF p. 16). Disabling memoization “typically increases the runtime, but not enormously”; Figure 8 shows some decreases, for example -7.29% for arraylist, and Figure 9 shows mean changes of +0.92% (VerCors) and +0.58% (Regressions). Omitting the paper’s triggers “typically improves verification time”, but “7% of the programs (11 out of the 156 original programs) fail spuriously in this version”; the longest-running example in the base implementation (“averaging 11.82s”) “takes only 3s without our triggers, but wrongly fails to verify”, and the longest-running example in the trigger-free variant “takes 8.83s but also has a high standard deviation of 4.71s” (section 6, PDF p. 16). The paper also seeded errors in 4 variants of each Figure 8 example and reports they were detected with lower runtimes. Inference: 9 + 65 + 82 = 156 matches the paper’s “156 original programs”. The paper reports an 11.82 s figure in the text and 11.81 s in Figure 9 for the same longest example; this study does not resolve the discrepancy.

Inference: the trusted components are the Viper symbolic-execution implementation, SMT solver soundness and behavior, the injectivity premise, inverse-function axioms, extensionality axioms, and source specifications; the paper does not provide a proof of soundness in the text read. The technique supports fractional permissions, and predicates whose bodies contain ISCs, such as the graph predicate of Figure 4 (section 3.3, PDF p. 10); it does not consider nested ISCs (“we do not consider nested ISCs, but an extension is possible”, section 3, PDF p. 6) and the implementation does not support predicates inside ISCs (section 3.3, PDF p. 10).

Inference: the product threat for agent-written verified Rust is concentrated in resource specifications. If an agent incorrectly states the set of locations covered by an array or graph invariant, Verus can prove the wrong ownership contract. The paper’s reusable ideas are a canonical quantified-resource representation, precise split/recombine accounting, explicit heap-dependent snapshots, and solver-context controls. Existing Viper work already implements these for permission logic; VL should test whether a simpler Verus ghost-map encoding preserves the same guarantees and performance before building a new verifier subsystem.

## techniques for the catalog

- quantified permission chunks — represent an unbounded ISC with a receiver-indexed value map and permission function under an injective receiver condition
- inhale and exhale — add, check, and remove quantified permissions using inverse constraints and exact permission accounting
- remove — greedily subtract requested permissions across all matching chunks and require zero residual demand
- value-map summarise — combine value and permission maps from all chunks for a field before symbolic evaluation
- partial snapshots — frame heap-dependent functions with first-order partial value maps and defunctionalized apply/domain operations
- trigger control — choose SMT quantifier triggers to avoid spurious failures, unpredictable search, and matching loops
- predicate integration — fold and unfold predicate instances through the same inhale/exhale machinery used for ISCs
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Evaluating pure quantifiers is handled by replacing the bound variable with a fresh constant and evaluating the quantifier body."): read the whole paper text (pp. 1-25, including appendices) and the whole study; checked every quotation, section and page reference, the inhale, exhale, remove, summarise, eval and partial-value-map steps against Figures 2, 3, 5, 6, 7 and 10, and the evaluation numbers against Figures 8 and 9 and the text of section 6; changed the contribution list, several page references (Figure 6 is on p. 13, the injectivity quote on p. 6, soundness text on p. 8), the injectivity step (checked by exhale only), the trigger description, the evaluation summary (added the paper's own inconsistency between "a few seconds" and 11.81 s, 11.82 s versus 11.81 s) and marked trust claims as Inference; did not check the Verus mapping suggestions (all labelled Inference), the cited external papers, the online examples, or any soundness proof (none is in the paper text).
