# Products of Recursive Programs for Hypersafety Verification (Extended Version)
(authored by agents unless marked 🧑)
Tag: `cheng2025products`, [paper](http://arxiv.org/abs/2504.10800v2)

## problem and core reduction

The paper reduces hypersafety verification of infinite-state recursive programs to ordinary safety verification by constructing explicit recursive product programs. Its abstract states: “We propose an infinite class of product programs, specifically designed with recursion in mind, that reduce the hypersafety verification of a recursive program to standard safety verification.” (Abstract, p. 1.) A k-safety property relates k runs; monotonicity of recursive integer division is a 2-safety example (Section 1, p. 1).

Inference: Use a product when a property compares several executions and an existing safety verifier is stronger than its relational mode. Make k disjoint copies, impose equal-input preconditions, run them in a chosen alignment, and prove one postcondition over the product. The alignment is the key engineering choice: sequential self-composition can lose recursive structure, while arbitrary parallel products require two stacks and are not ordinary recursive programs (Section 1, pp. 2–3).

## technique 1: preserve recursion with visibly pushdown alignments

Inference: Represent each recursive run as a well-nested word of calls, returns, and internal actions. A product alignment is valid only when the merged word remains well nested and can execute on one stack. The paper uses visibly pushdown languages (VPLs) because their call/return alphabet preserves this syntactic structure (Section 1, pp. 3–4).

1. Give each component a disjoint call, return, and internal alphabet (Section 2.1, pp. 7–8).
2. Form the parallel shuffle of component runs, which admits all interleavings that preserve each component's order (Section 1, pp. 3–4).
3. Select a subset of interleavings by an alignment order. The order must avoid a return from one component while another component's call is pending, or the resulting path is ill nested (Section 3.2, pp. 11–12).
4. Represent the selected language as a VPA, nested word automaton (NWA), or visibly pushdown grammar (VPG), then interpret it as a recursive product program (Sections 4 and 7, pp. 13–20).

The key sufficient condition is explicit: “If ≺ is a visibly pushdown and coherent contextual order, then red ≺ (𝑃1 ∥ 𝑃2 ) is visibly pushdown and well-nested.” (Theorem 3.18, p. 12.)

Inference: In Verus, a product program can be written as a proof-only recursive function over a tuple of component states, with explicit branch cases for lockstep and one-sided recursion. Use `requires` for relational preconditions and `ensures` for the combined postcondition. The VPL/VPA machinery is an inference-level construction around Verus; Verus does not automatically synthesize it.

## technique 2: lexicographic reductions and sleep-set construction

Inference: Use a lex reduction when component steps commute and many interleavings are equivalent. Define a contextual total order over enabled actions, then retain only the minimal representative of each equivalence class under commuting independent actions. The paper proves that any reduction under a sound commutativity relation can replace the full parallel product (Theorem 2.6 and Section 3.1, pp. 8–10).

The generic construction uses a sleep-set style automaton over the action alphabet, then intersects it with the baseline product language (Section 4, p. 13). For recursive programs, the reduction is required to remain visibly pushdown and well nested. The paper's well-nested shuffle is “the set of well-nested words in 𝐿1 ∥ · · · ∥ 𝐿𝑛” (Definition 4.1, p. 13); it is associative, and VPLs are closed under it (Theorem 4.2, p. 13).

Inference: Apply this to relational Rust proofs by identifying independent proof-state transitions and selecting a canonical ordering. The commutativity proof is essential: a reduced product is sound only if swapping the selected steps preserves the observable postcondition. A Verus proof should state this as a lemma over abstract states; it cannot be assumed merely because two Rust calls touch different syntactic variables.

## technique 3: parameterized canonical reductions

The full space of contextual orders is infinite and hard to search, so the authors define canonical reductions as programmer-facing building blocks. They require three properties: intuitive scheduling, concise compositional specification, and enough expressiveness for a broad class of instances (Section 1, pp. 5–6). The examples include `(1,1)` lockstep, s-lockstep, and nested concatenation.

Inference: Select a reduction from the relational property rather than from the implementation alone. For monotonicity, use lockstep while both division copies recurse, then continue the longer copy. For scaling, use an asynchronous rate such as one recursive call of one copy against two of the other. For distributivity, first merge two recursive runs with nested concatenation, then align the merged run with the third (Section 1, pp. 3–6; Section 6, pp. 16–19).

The direct canonical construction maintains reachable symbols and adds only productions that are reachable, eliminating useless nonterminals (Section 6.3, pp. 19–20; Appendix D, Algorithm 1). This yields a VPG whose productions encode the recursive alignment directly. Inference: a Verus implementation can expose these canonical schedules as proof combinators or recursive ghost functions, avoiding a general search over all call interleavings.

## technique 4: encode the product for safety solvers

HyRec accepts a program, a relational property, and a parametric canonical reduction, for example: `HyRec div -property distributivity -reduction "(1,1)-lockstep(P3, nested_concatenation(P1,P2))"` (Section 8.1, p. 20). It constructs an NWA, VPG, or direct VPG, and encodes the product and postcondition as constrained Horn clauses (CHCs) for Z3/Spacer, Eldarica, or Golem (Section 8.1, pp. 20–21).

For NWA encoding, HyRec uses one predicate per automaton state and one constraint per transition. It adds a ghost return-address variable so only context-sensitive paths must be inductive; the naive encoding would be unsound for unsatisfiability (Section 8.1, p. 21). For VPG encoding, one predicate per nonterminal overapproximates the generated language; each production becomes a constraint, and a stack-free inductive semantics suffices for partial correctness of well-matched traces (Section 8.1, p. 21).

Inference: In Verus, the same idea becomes a recursive proof function whose induction follows product grammar productions. A return-address ghost variable or explicit continuation state can distinguish context-sensitive paths. CHC details are paper-specific, but the principle is portable: encode only the chosen well-nested traces and prove the relational postcondition by induction over their structure.

## evidence and denominators

The evaluation contains 103 benchmarks: 62 arithmetic and 41 array benchmarks; all but four have arity 2 or 3, with maximum arity 7 (Section 8.2, p. 22). HyRec compares Direct, VPG, and Aut constructions with a baseline of sequential composition, direct encoding, and k-copy encoding, using a 600-second timeout (Section 8.3, pp. 22–23). It solves 98 of 103 benchmarks; Direct contributes 73 wins, VPG 17, and Aut 13, with ties counted in each algorithm's contribution (Section 8.3, p. 23). The five failures include one CHC-solver shortcoming, two multiplication instances outside the reductions' decidable theory, and other alignment limitations (Section 8.3, pp. 23–24).

For higher arity on the division monotonicity family, Direct scales to k=12, Aut to k=7, and VPG to k=6; the largest Direct instance has 105 CHC predicates and encoding takes 33% of total time (Section 8.3, p. 23). These are measured on the paper's benchmark and timeout, not general guarantees. The paper explicitly limits HyRec to sequential recursive programs and presents concurrency mainly as a theoretical sequentialization result (Section 8.3, p. 22).

## what is proved, trusted, and useful for VL

The soundness theorem proves that a selected reduction may stand in for the full product under the commutativity and well-nestedness assumptions. The CHC solver then proves the safety property of the constructed product. Trusted inputs include the relational specification, disjointness/commutativity assumptions, VPA/VPG construction, CHC encoding, solver, and the component program semantics. Inference: a Verus proof can remain valid while a guessed commutativity relation omits an interaction or while the relational property states the wrong security condition.

Inference: VL should reuse explicit relational products for comparing two agent-generated Rust executions, especially determinism, refinement, noninterference, or resource monotonicity. It should begin with canonical schedules and document when steps commute. The paper's result does not establish automated hypersafety verification for arbitrary Rust, shared-memory concurrency, or arbitrary recursive products; those remain outside its demonstrated scope.

## techniques for the catalog

- recursive product programs: reduce k-run hypersafety to one safety proof while preserving single-stack recursion
- visibly pushdown alignment: restrict interleavings to well-nested call/return traces represented by VPA, NWA, or VPG
- lex reductions: select minimal representatives under a proved commutativity relation using contextual orders and sleep-set construction
- canonical schedules: compose lockstep, rate-based, and nested-concatenation building blocks chosen from the relational property
- grammar-to-chc encoding: encode product automata or grammars as inductive Horn constraints with context-sensitive return tracking
Checked 2026-10-15 against paper cheng2025products: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
