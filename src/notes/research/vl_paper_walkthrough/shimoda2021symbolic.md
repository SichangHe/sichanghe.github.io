# Symbolic Automatic Relations and Their Applications to SMT and CHC Solving
(authored by agents unless marked 🧑)
Tag: `shimoda2021symbolic`, [paper](http://arxiv.org/abs/2108.07642v1)

## purpose and result

The paper introduces symbolic automatic relations (SARs), a finite automaton representation for relations over integer-labelled words, and uses them as a decidable, compositional language for recursive list properties. The central engineering result is a translation from a fragment of SAR formulas to constrained Horn clauses (CHCs) over integers. A CHC solver then supplies an automated, sound but incomplete satisfiability checker. The paper also gives an ICE-learning application: SAR formulas are candidate models for CHCs over lists, and the SAR checker is the teacher that checks candidates.

The authors state the problem directly: “reasoning about recursive data structures remains as a challenge for verification tools and their backends such as SMT and CHC solvers” (abstract, p. 1). Their claimed contribution is a checker “by a reduction to CHC solving” (abstract, p. 1), with effectiveness measured on three benchmark families. This is a backend technique rather than a Rust-language proof system. Inference: VL could use the same architecture when a Verus specification contains recursive lists or tree-shaped ghost data that Z3 cannot reason about directly.

## technique 1: represent recursive relations as symbolic synchronous automata

What it is. A symbolic synchronous nondeterministic finite automaton (ss-NFA) reads several list words in lockstep. A transition has a source state, a destination state, and a quantifier-free linear-integer-arithmetic label over the current letters and parameter variables. The accepted convolutions of the input words define a symbolic automatic relation (SAR). SARs inherit Boolean closure and have decidable emptiness when the underlying label theory is decidable. The paper emphasizes: “Symbolic automatic relations (SARs) inherit good properties of automatic relations and symbolic automata: SARs are closed under Boolean operations” (Section 3, p. 5).

When to use it. Use an SAR when a relation compares corresponding positions of one or more recursively defined lists, while each local comparison is expressible in linear integer arithmetic. Examples include sortedness, list equality with a shift, `nth`, and the graph of insertion sort's `insert` function. Do not use it as a complete decision procedure for arbitrary arithmetic: the paper proves general SAR satisfiability undecidable (Section 4, p. 11).

How to do it.

1. Define the list relation as a synchronized automaton. Give states, initial and final states, and one transition for each recursive case. Put local arithmetic conditions on transitions. Example 1's automata use labels such as `l0 = l1 + 1` and `l2 = x` (Section 3.2, pp. 7–8).
2. Encode list constructors and destructors as synchronized input tracks. A shifted track represents `tail(X)`; padding symbols mark the end of a shorter word. The convolution operation is defined before the SAR definition (Definitions 4–5, pp. 8–9).
3. Build higher predicates from the automaton. The paper expresses `sorted(X)` as `R_M1(X, tail(X))`, and defines `nth(i,x,X)` existentially using `R_M2(x)` and a constructed list (Example 2, p. 9).
4. Close formulas under Boolean operations. Normalize a formula to the paper's Δ¹_sar fragment when the checker is required; both a predicate and its negation are supplied for existentially defined predicates (Section 6, p. 18).

Verus form. Inference: encode an executable Rust list as a ghost `Seq<int>` or a recursively defined mathematical sequence, and define a `spec fn` for each transition relation. A Verus `spec fn` can express the local arithmetic relation; `requires` and `ensures` on a proof function can connect the executable list operation to that relation. For a finite automaton, represent states as an integer or an enum in specifications and prove a transition invariant with a `proof fn`. The paper's automata are mathematical and do not carry over as a Verus solver primitive: the automaton-to-CHC compiler and CHC backend would remain an external tool or would have to be reimplemented as ghost definitions and lemmas. Inference: a practical VL integration would generate a Verus lemma obligation for each automaton transition and discharge local arithmetic with `assert`/`assert forall` facts, rather than ask Verus to decide SAR satisfiability.

Evidence. The implementation accepts ss-NFAs and Δ¹_sar formulas and automatically converts inputs to normal form. On 87 total instances, Ours-Eldarica solved 85 (72 valid, 13 invalid, and 2 instances not solved by the other tools), while Ours-HoIce solved 80 (67/13/1) and Ours-Spacer 59 (46/13/0) (Table 1, p. 18). These are solved-instance counts, not proof percentages; 85/87 is 97.7% for Ours-Eldarica. Average times over solved instances were 4.006 s for Ours-Eldarica, 5.275 s for Ours-HoIce, and 0.942 s for Ours-Spacer (Table 1, p. 18).

Failure and assumptions. The underlying transition labels are quantifier-free linear integer arithmetic in all benchmarks (Section 6, p. 18). One of the two Ours-Eldarica failures requires nonlinear arithmetic, specifically `x ≥ y × z`, which the backend cannot prove (p. 19). The procedure is sound but incomplete, and the general satisfiability problem is undecidable (abstract, p. 1; Section 4, p. 11). Inference: a Verus port inherits solver incompleteness and additionally depends on the correctness of the generated ghost specification.

## technique 2: normalize SAR arguments and reduce them to CHCs

What it is. The reduction handles Σ¹_sar formulas whose list arguments can be made cons-free and gap-free and whose integer arguments are variables. A normal formula uses only `nil` or `tail^n(X)` list terms, includes every intermediate tail, and has integer variables as scalar terms (Definitions 8–9, pp. 13–14). For each automaton state `q`, create an integer CHC predicate `q(...)` describing possible next letters and parameters. Translate transitions, initial states, and final states into clauses. The result preserves satisfiability by making acceptance equivalent to deriving false: “we construct a set of CHCs Π such that M ⊨ ∃x∃X.nth(i, x, X) iff Π is unsatisfiable” (Section 5.1, p. 13).

When to use it. Use this reduction when the SAR formula is existential and can be normalized. It is useful when the target CHC solver is stronger on integer arithmetic than an SMT solver is on recursive datatypes. It does not apply unchanged to universal or higher SAR fragments, and it is not a complete decision procedure.

How to do it.

1. Normalize list terms. Add ignored automaton tracks to make the set of tails gap-free. Rewrite scalar terms into automaton parameters. These are explicitly described as easy transformations before Lemma 1 (Section 5.2, p. 15).
2. Eliminate `cons` by unrolling the automaton and passing the consed value as a parameter. The paper's example replaces `R_M2(x)(cons(1,cons(t,Y)),cons(0,Y),X,x)` with `R_M'2(x,y)(cons(1,Y),cons(0,tail(Y)),X,x,t)` and preserves satisfiability (Lemma 1 example, p. 15).
3. Introduce one CHC predicate per automaton state. For every transition `p —φ→ q`, emit a clause whose body includes the transition label, the shift relation between adjacent tails, padding constraints, and a not-at-end condition (Definition 9, p. 14).
4. Add initial clauses. For each initial state, constrain input tracks to `nil`/padding as appropriate and bind the automaton parameters (Definition 9, p. 14).
5. Add acceptance clauses. For each final state emit `⊥ ← q(...) ∧ φ_end`, so false is derived exactly when a final state is reached after all input is consumed (Definition 9, p. 14).
6. Run the CHC solver. Theorem 2 proves that an accepting automaton run corresponds to a derivation of false and vice versa (Section 5.3, pp. 16–17).

Verus form. Inference: represent each state predicate as a `spec fn q(...) -> bool` over integer indices and sequence values. Use `requires` to state list-shape conditions and `ensures` to state that a transition preserves the state predicate. Encode `φ_shift`, `φ_pad`, and `φ_end` as Boolean spec functions, then prove each generated clause as a Verus `proof fn`. Verus has no direct CHC clause declaration in the documented constructs; the reduction therefore becomes a collection of lemmas whose quantified postconditions simulate the clauses. Keep the acceptance contradiction as an `assert(false)` reached under a proof precondition, rather than attempting to execute proof code.

Evidence. Theorem 2 is the paper's formal correctness evidence (Section 5.3, pp. 16–17). The experiment's 85/87 Ours-Eldarica result is the end-to-end evidence under the stated machine and 60-second timeout (Section 6, p. 18; Table 1, p. 18). The paper reports that SMT recursive-function translations solved only 38/87 (Z3) and 40/87 (CVC4), and assertion translations solved 30/87 and 28/87 respectively (Table 1, p. 18). These denominators include all three benchmark families: 15 IsaPlanner, 60 SAR SMT, and 12 CHC instances.

Failure and assumptions. The translation's proof assumes the formula is in the specified Σ¹_sar fragment and that the input labels fit linear integer arithmetic. The tree-automaton extension is only a proposal: “The formalization of the extension is left for future work” (Remark 3, p. 16). The reduction also creates a CHC problem whose solver may time out or fail to find a proof even when the original formula is satisfiable or unsatisfiable. Inference: VL should treat a failed backend query as unknown and preserve a sound fallback proof path.

## technique 3: use SARs as ICE-learning teacher certificates

What it is. In ICE learning, a learner proposes interpretations for unknown CHC predicates and a teacher checks whether the candidate is a model. The paper maps list-valued predicate candidates to Δ¹_sar formulas and checks the candidate by the SAR satisfiability procedure. In Example 4, a model maps `P(X)` to `sorted(X)` and `Q(X)` to `hasZero(X)` (Section 3.4, pp. 10–11). SARs are certificates because the candidate itself is a finite automaton representation that can be checked independently.

When to use it. Use this arrangement when a verifier synthesizes invariants or predicate interpretations over recursive data. The learner may remain heuristic; the teacher must be sound. The candidate language is limited to relations expressible by SARs, so a valid model outside that language will not be found.

How to do it.

1. Convert each list CHC candidate predicate into a SAR formula. For predicates defined by recursion, build an ss-NFA for the relation and provide its negation when existential quantification requires it (Section 6, p. 18).
2. Construct the CHC model-checking query by substituting candidate formulas for predicate variables.
3. Normalize and reduce each resulting Δ¹_sar query to integer CHCs using Technique 2.
4. Ask the backend solver whether the resulting obligations are satisfiable/unsatisfiable. Reject a candidate when any CHC has a counterexample; accept it only when all obligations pass.
5. Feed counterexamples back to the learner, as in the ICE protocol. The paper identifies the SAR checker as the “teacher” part of ICE-based CHC solving (Section 6, p. 18).

Verus form. Inference: model the learner's candidate as a ghost map from predicate identifiers to `spec fn` relations, or generate one fixed Verus spec relation per candidate. Prove a `proof fn` for every CHC clause showing that the candidate preconditions imply the candidate postcondition. Counterexamples can be represented as failing proof obligations or concrete test inputs; Verus itself does not provide the ICE learner, so candidate generation remains external.

Evidence. The CHC benchmark contains 12 instances (all valid), and Ours-Eldarica solved all 12, Ours-HoIce 11, and Ours-Spacer 8 (Table 1, p. 18). The benchmark also includes CHCs reduced from refinement-type checking (Section 6, p. 18). The paper reports that SARs “serve as certificates of the satisfiability of CHCs” (Section 3.4, p. 10).

Failure and assumptions. A certificate proves only the encoded CHC model under the arithmetic theory and automaton semantics. The learner's search completeness is not established. Inference: a VL agent that generates candidate Verus invariants can use this as a trusted-checker pattern, but a passing candidate does not establish that the candidate captures the product requirement.

## what is proved, measured, and trusted

The paper proves closure and decidability properties for SAR representations, undecidability of unrestricted SAR satisfiability, correctness of the Σ¹_sar-to-CHC reduction, and soundness of the experimental checker. It measures solved-instance counts and average time on 87 instances, with AMD Ryzen 9 5900X at 3.7 GHz, 32 GB memory, and a 60-second timeout (Section 6, p. 18). It does not measure proof-construction effort, solver memory, robustness under benchmark changes, or the cost of translating real Verus specifications.

The trusted base includes the automaton and formula parser, the reduction implementation, the CHC solvers Spacer/HoIce/Eldarica, and the arithmetic semantics. The paper's checker reports only SAT, UNSAT, or TIMEOUT and “does not provide any witness of the satisfiability” (Section 6, p. 18). Inference: for agent-written verified Rust, the main product threat is specification mismatch and solver incompleteness around recursive state; SARs can reduce backend blind spots but do not validate that the modeled list relation is the intended API behavior.

## what VL should not redo

VL should not redo the basic finite-automaton encoding of list relations, the Σ¹_sar CHC translation, or the three-solver comparison unless it needs a Rust-specific replication. Those parts are already formalized and experimentally evaluated. A useful new effort would instead measure generated Verus proof size, maintenance after list-data-structure changes, and whether candidate invariants produced by an agent stay within the SAR fragment.

## techniques for the catalog

- symbolic synchronous automata: encode recursive list relations as ss-NFAs whose transition labels are linear integer formulas
- SAR-to-CHC reduction: normalize list terms and emit state, transition, initial, and acceptance CHCs over integers
- ICE teacher certificates: use SAR formulas as finite candidate models and check every CHC obligation with the reduction

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
