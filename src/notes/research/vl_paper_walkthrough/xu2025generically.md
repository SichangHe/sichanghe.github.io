# Generically Automating Separation Logic by Functors, Homomorphisms, and Modules
(authored by agents unless marked 🧑)
Tag: `xu2025generically`, [paper](https://doi.org/10.1145/3704903)

## scope and central idea

Xu et al. build an algebraic theory that generates separation-logic (SL) reasoning rules for data structures instead of requiring a hand-written rule for each structure. Predicates are interpreted as refinement relations between concrete resources and abstract values. Functor, separation-homomorphism, scalar-distributivity, scalar-associativity, identity, and transitivity properties describe how a predicate operator transforms abstractions. A generic solver instantiates rule templates from proved property instances, then uses the rules to generate pure proof obligations for SL entailments. The presentation uses a weakest-precondition (wp) transformer; the implementation uses a strongest-postcondition (sp) transformer for symbolic execution (Section 10.1, PDF p. 22).

The abstract states: “Based on this theory, we develop a generic SL automation algorithm to reason about any data structures that can be characterized by these algebras.” (Abstract, PDF p. 1). The paper’s workflow starts with an SL entailment, reduces it to bi-abductive transformation problems, and sends pure proof obligations to Isabelle/HOL tactics or automated theorem provers. The introduction reports: “We evaluate this reasoner through 10 widely-used data structures and 592 lines of programs in formalized semantics in Isabelle/HOL.” (Section 1, PDF p. 3). The implementation is a foundational Isabelle/HOL framework; concurrency is unsupported (Section 10.1, PDF p. 23).

## technique 1: refinement predicates and algebraic properties

What it is. An SL predicate `T` maps an abstract value to the set of concrete states that refine it. The notation `x : T` abbreviates predicate application. Operators over predicates model containers, fields, slices, modalities, and composition. The paper identifies six property families (Table 1, PDF p. 3); scalar identity S1 and scalar zero S0 are also formalized in Figure 2 (PDF p. 8):

- TF (functor): maps an element transformation through a container, enabling `List(T)` to `List(U)` subtyping
- SH (separation homomorphism): distributes a container predicate over separated components
- SA (scalar associativity): collapses or expands nested module-like operators
- SD (scalar distributivity): splits or concatenates slices
- IE (identity elements): identifies abstractions transformable to or from empty resources
- Tr (transitivity/equivalence): supplies a relation on abstractions sufficient to entail transformation within one refinement predicate

When to use it. Define a predicate operator for each aggregate structure, then prove whichever algebraic properties its transformations satisfy. The paper’s motivating example uses TF to transform a list of non-null pointers into a list of nullable pointers, avoiding a manual RefinedC typing rule (Section 2, PDF pp. 4–5).

How to apply it. (1) Define the base refinement relation for an element type. (2) Define the aggregate operator, such as `List_a(T)` or a slice operator. (3) Prove algebraic property instances for that operator. (4) Feed the instances to the corresponding rule templates. (5) Let the solver rewrite the aggregate transformation into element-level subproblems. (6) Discharge the remaining pure side conditions in Isabelle/HOL.

Verus form. Inference: represent a refinement relation as a Verus `spec fn` over an abstract sequence and a ghost model of memory. Prove functor/homomorphism lemmas with `proof fn`s and use them as rewrite facts in proof blocks. Inference: this would require implementing the corresponding resource model and rule-generation support; the paper supplies no Verus implementation.

Evidence and limits. Algebraic properties must still be supplied or proved for base structures. The theory does not make an arbitrary predicate automatically compositional. If a structure lacks the required property, the solver falls back or fails.

## technique 2: transformation problems and bi-abduction

What it is. A transformation problem TP(T,U,D) asks for a pure condition and abstraction function that transform predicate `T` into `U` over candidate terms `D`. A bi-TP adds an anti-frame `Z` (resources demanded by the target but absent from the source) and a frame `R` (source resources left over). This handles partial overlap between source and target resources.

How to apply it. (1) Extract an SL entailment from program correctness. (2) Eliminate goal connectives and source existentials to obtain bi-abductive entailment problems (bi-EPs), plus obligations to obtain missing demands from empty resources and handle remaining resources. (3) Decompose each composite bi-EP into bi-EPs between predicate applications, carrying missing targets and source remainders forward. (4) Reduce these atomic bi-EPs to bi-TPs using the target predicate’s Tr property. (5) Invoke the prioritized TP/bi-TP solver. (6) Collect the pure proof obligations, including transformation-function domain conditions and the relation between computed and requested abstractions. The paper describes the decomposition as repeatedly extracting target bunches from source bunches while carrying remainders forward (Section 8.2, PDF pp. 17–19).

The paper says: “The rules are prioritized: ad-hoc rules have the highest priority, then instantiated rules, and at last fallbacks.” (Routine 1 and Section 6.2, PDF p. 12). Ad-hoc rules cover special cases such as identical predicates or predicate counterparts of connectives. Fallback FB1 downgrades bi-TP to TP; FB2 treats source and target partitions as disjoint and returns the entire target as demand and entire source as remainder (Section 6.4, PDF p. 12).

Verus form. Inference: model anti-frames and frames as ghost resource maps or sequences and write lemmas that split a source model into target and remainder. Use explicit `ensures` for the resulting partition and a pure condition for side obligations. Verus proof blocks can apply these lemmas, but no automatic bi-abduction engine is implied.

## technique 3: algebraic rule templates

What it is. Rule templates turn algebraic instances into concrete reasoning rules. TF and SH remove a common container operator and move reasoning to elements. SDL/SDR split or merge slices when scalar addition relates their bounds. SAL/SAR collapse or expand nested module operators using scalar multiplication. S0L/S0R eliminate zero-scaled operators; S1I/S1E add or remove an identity wrapper. The templates are instantiated by substitution of property arguments, and the instantiated proof is derived from the supplied property proofs (Section 6.5, PDF pp. 13–14).

How to apply it. (1) Register an algebraic property instance with its proof. (2) Substitute the instance’s operator, mapper, and scalar functions into the template. (3) Insert the resulting rule into the prioritized rule sequence. (4) Match a TP or bi-TP against a template. (5) Check arithmetic side conditions in the scalar algebra. (6) Recurse on the reduced subproblem. The matrix example applies SDR to split an outer slice, SH to remove the common slice operator, SDR again, and finally the identity rule (Section 6.6, PDF pp. 14–15).

The method has a known gap: when a predicate operator is both scalar-associative and scalar-distributive, multiple decompositions may be possible and the solver lacks general support for their combination. The authors state that rewriting nested scalar-associative operators before solving can avoid some ambiguity, but non-associative matrix intervals require manual rules (Sections 6.5 and 10.2, PDF pp. 14 and 25).

Verus form. Inference: these templates suggest generic proof lemmas parameterized by operator laws, with separate lemmas for sequence splitting, nested composition, and identity. Use `Seq` index arithmetic and quantified assertions; prove each side condition explicitly. Do not claim Verus automatically instantiates algebraic proof rules unless such a framework is implemented.

## technique 4: wp-transformer to program verification

What it is. The paper defines a generic nondeterministic state-monad language and a set of wp rules for operators such as load, store, conditionals, and bind. Routine 2 runs backward through the program to produce an SL entailment whose validity implies the Hoare triple. The reasoner then reduces that entailment to bi-EPs, bi-TPs, and pure proof obligations.

How to apply it. (1) Define the language’s state and operator semantics. (2) Provide wp rules for each primitive and higher-order control operator. (3) Start with precondition, program, and postcondition. (4) Apply wp rules backward, using bind to connect sequential commands. (5) Obtain an entailment `pre → generated_goal`. (6) Restrict formulas to the supported state/goal grammars, or wrap richer formulas in predicates with supplied algebraic properties. (7) Decompose and solve the entailment as above. (8) Send residual pure obligations to Isabelle/HOL or an ATP.

The paper states: “Illustrated in Fig. 1, the process first uses the wp-transformer shown in Routine 2 to extract an SL entailment that implies the desired program correctness; then, it applies an SL entailment reasoner to extract an FOL formula as a proof obligation that implies the validity of the given SL entailment.” (Section 8, PDF p. 16). The supported grammar excludes some direct forms, but wrapping a formula in a predicate can recover it if its algebraic properties are provided (Section 8.1, PDF pp. 16–17).

Verus form. Inference: use Verus function contracts and proof lemmas to encode the same backward reasoning for a Rust API. A `requires`/`ensures` contract supplies the endpoint entailment; helper lemmas establish load/store/frame transformations. Inference: a corresponding transformer could be implemented as a library or generator using Verus contracts; the paper does not evaluate this transfer.

## technique 5: proving predicate properties compositionally

What it is. Section 9 automates proofs of the algebraic properties themselves, reusing the SL reasoner and proved component properties. Users still specify the property arguments and prove residual pure obligations (PDF pp. 20–22).

How to apply it. For a non-recursive predicate, construct the property’s defining entailment, unfold the predicate once, and send the resulting entailment to the SL reasoner. For TF, also register a temporary element-transformation TP rule. For a recursive predicate, apply well-founded induction, unfold the source predicate, and use a functor property to lift the induction hypothesis through its component operator. Prove that the component domain lies within the strict predecessors of the induction argument. Unfold recursive occurrences on the target side once to equalize recursion depth, then use the ordinary entailment reasoner (Section 9, PDF pp. 21–22).

Evidence and limits. Automatic derivation requires predicate definitions within the state grammar S; properties of other predicates require manual proofs. The recursive strategy is sound but incomplete. The evaluation reports: “The algorithms automate the verification condition generation for all properties in the case studies in this section and ∼95% of the properties used in our system implementation.” (Section 10, PDF p. 22). This measures verification-condition generation, not complete automatic proof of every property.

Verus form. Inference: prove aggregate laws from component lemmas, using explicit induction for recursive structures and separate proofs for domain and termination conditions.

## evidence, measured behavior, and contradictions

The authors formalized the theory, templates, solver, and verifier in Isabelle/HOL. The introduction reports “10 data structures in a total of 592 lines of 8 programs” (Section 1, PDF p. 3). Table 3 presents ten groups of routines and distinguishes manual algebraic-property work, annotations, manual proofs, auxiliary theories, and verification time (PDF pp. 23–24). They report that approximately 300 predicate-transformation rules exist in the full system, about 80% generated automatically; the remaining rules are ad-hoc rules for specific predicates, typically predicate counterparts of connectives (Section 10.2, PDF p. 25). Among case-study annotations, 64% are folding/unfolding, 25% loop invariants, and 11% reasoning guidance (Section 10.2, PDF p. 25). These are percentages of annotations in the case studies, not percentages of all lines or all proof obligations.

Rule application is reported as generally under 0.15 ms per application on an Intel i9-13900K with 16 cores and 32 GB RAM (Section 10.2, PDF pp. 25–26). The authors caution that theoretical complexity is at least quadratic because of bi-abduction, while measured behavior is closer to linear when expression trees have bounded branching. Verification times in Table 3 separate rule application, proof search, and replay; cached replay omits the search component. The paper states: “These specifications cover partial correctness only.” Total correctness is future work because it needs an order-preserving predicate property (Section 10.2, PDF p. 24).

The logic also omits concurrency, higher-order fiction, higher-order ghost state, later modality, address-of for locals, `goto`, loose expression evaluation ordering, and first-class function pointers (Sections 10.1 and 10.3, PDF pp. 23–27). Side-condition automation can assume a condition is false after timeout; if the condition is actually true, reasoning may fail until the user proves and registers it (Section 10.3, PDF p. 27). Inference: treating an unresolved condition as false can lose a valid proof route; this is a completeness limitation, not evidence of an unsound accepted proof.

## what VL should learn and threat assessment

The paper reports an Isabelle/HOL formalization and successful partial-correctness case studies (Sections 1 and 10). Its semantics simplify pointer behavior: “These simplifying assumptions mean that we do not grapple with complex questions of pointer provenance that are raised by program logics over a fully-faithful C semantics with undefined behaviour [64].” (Section 10.1, PDF p. 23). Inference: transferring the results to Rust requires justifying the resource model and its connection to Rust semantics. Algebraic instances and side conditions require proofs; they are not merely unchecked user assertions.

Inference: the strongest lesson for VL is to separate a generic proof-rule library from structure-specific models. A Verus library could provide reusable sequence, map, tree, and slice lemmas whose contracts expose algebraic laws; a generator could select those lemmas based on a data-structure interface. Inference: the relevant risk for agent-written verified Rust is a mismatch between the proved abstract model and the intended program behavior. Requiring proofs of the algebraic laws and side conditions does not itself establish that connection.

Inference: VL should not redo generic notions of functorial container lifting, separation homomorphism, frame/anti-frame bi-abduction, or wp-to-entailment reduction as if they were novel. Possible new contributions include a Verus implementation evaluated on Rust programs, or extensions to concurrency or total correctness.

## techniques for the catalog

- algebraic predicate laws — characterize containers and modalities with functor, homomorphism, associativity, distributivity, identity, and transitivity properties
- TP and bi-TP solving — reduce refinement transformations to pure conditions with inferred frame and anti-frame resources
- prioritized rule templates — instantiate generic transformations from algebraic property proofs, with ad-hoc and fallback rules
- wp-to-SL entailments — derive program-correctness entailments backward from generic weakest-precondition rules
- compositional property derivation — unfold a new predicate once, reuse proved component laws, and apply induction for recursive definitions
- compositional data-structure automation — preserve predicate abstractions during transformation reasoning while requiring explicit program-verification folding and unfolding annotations
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "At this point, the algorithm assumes that all reasoning processes about induction have been completed."): checked all study quotations, numbers, section/page references, technique steps, and limitations against the complete paper including appendices; corrected quotations, Tr/IE descriptions, bi-EP reduction order, the scalar-associativity/distributivity limitation, wp versus sp implementation, evaluation scope, and the completeness interpretation; added compositional property derivation and marked transfer recommendations as inferences; did not rerun the Isabelle artifact, reproduce measurements, or validate the proposed Verus transfer.
