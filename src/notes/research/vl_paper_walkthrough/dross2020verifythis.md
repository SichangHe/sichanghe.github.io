# VerifyThis 2019: A Program Verification Competition (Extended Report)
(authored by agents unless marked 🧑)
Tag: `dross2020verifythis`, [paper](http://arxiv.org/abs/2008.13610v3)

## scope and result

The report describes a two-day, human-centred competition: 13 teams, 21 participants, and three 90-minute verification challenges. The paper says, "VerifyThis aims to bring together researchers and practitioners interested in formal verification, providing them with an opportunity for engaging, hands-on, and fun discussion" (section 1, p. 2). Its evidence is therefore both technical (algorithms, specifications, proofs) and empirical (submissions, interviews, and a regression over 21 historical challenges).

Inference: for VeruLaw (VL), the useful lesson is a repeatable benchmark that measures whether an agent can choose representations, write contracts and invariants, and close proofs under a time budget. The paper does not evaluate Rust or Verus, so the following Verus mappings are inferences.

## technique 1: staged specification and invariant strengthening for monotonic segments

what it is and when to use it

Challenge 1A asks for an array scan that returns maximal monotonic cutpoints, then asks for progressively stronger properties. The paper defines four base properties: non-empty, begin-to-end, within bounds, and monotonic; maximality is an advanced strengthening. The authors give the algorithm as a single scan: maintain `x` and `y`, determine whether the current segment is increasing, advance while the relation remains unchanged, append `y`, then continue. The paper’s exact algorithm description is: "maximal monotonic cutpoints can be computed by scanning s once while storing every index that corresponds to a change in monotonicity (from increasing to decreasing, or vice versa)" (section 2.1.1, p. 4).

how to apply it

1. Represent the input sequence and cutpoints in the verifier’s convenient model; the organizers explicitly allow arrays, mathematical sequences, or dynamic lists (section 2.2, p. 5)
2. Prove non-empty, endpoint, and bounds properties for the result (section 2.1.1, p. 4)
3. Prove that every interval between adjacent cutpoints is increasing or nonincreasing (section 2.1.1, p. 4)
4. Strengthen the predicate with maximality and prove that extending a segment at either endpoint breaks monotonicity; teams found it preferable to state right and left maximality separately (section 2.4, p. 7)
5. Add loop invariants relating processed indices, the current segment direction, and already emitted cutpoints; the report says teams that succeeded needed “a few key invariants” (section 2.3, p. 6)

Verus form

Inference: encode the result as a `Seq<int>` or a vector model and write a `spec fn` for each property. A Rust loop can carry `invariant` clauses for bounds, the processed prefix, and the relation between the last cutpoint and the current scan index. Use `requires` for a sorted-domain assumption and `ensures` for the four properties plus maximality. Keep executable arrays separate from mathematical sequences, and use proof fns/lemmas to connect indexing facts. Do not treat `invariant` as a function call.

evidence and limits

The report records that Team OpenJML and Team The Refiners submitted complete, correct solutions; five teams made substantial progress but skipped maximality or used simplifying assumptions, and five made more limited progress (section 2.3, p. 6). OpenJML’s array-oriented implementation was close to the pseudocode and its SMT backend discharged the proof after suitable loop invariants (section 2.3, p. 6). Frama-C participants incurred extra memory-safety and separation obligations before functional properties (section 2.3, p. 7). Model checking required finite bounds on sequence length and values (section 2.3, p. 7). These denominators are teams in this 13-team event, not arbitrary programs.

## technique 2: refinement and representation choice for GHC sort

what it is and when to use it

Part 1B decomposes GHC sort into (1) split into monotonic segments, (2) reverse decreasing segments, (3) pairwise merge, and (4) repeat until one ordered sequence remains (section 2.1.2, p. 5). The merge algorithm preserves sortedness while consuming two sorted sequences. The paper’s concrete example sorts `3 2 8 9 3 4 5` as `3 2 | 8 9 | 3 4 5`, then `2 3 | 8 9 | 3 4 5`, then `2 3 8 9 | 3 4 5`, and finally `2 3 3 4 5 8 9` (section 2.1.2, p. 5).

how to apply it

1. Specify each helper (cutpoint construction, reversal, merge) before composing them (section 2.1.1–2.1.2, pp. 4–5)
2. Prove merge sortedness and permutation of its two inputs
3. Prove that reversing a decreasing segment yields an increasing segment
4. Prove that pairwise merging preserves the multiset of values and sortedness
5. Use induction on the number of segments to establish the final sorted permutation

The Refiners used recursive predicates and Isabelle’s refinement framework; OpenJML stayed close to arrays and pseudocode. VerCors teams used immutable sequences to avoid array permissions (section 2.3, p. 6).

Verus form

Inference: model permutation with a `Multiset` specification and sortedness with a quantified predicate over sequence indices. Use separate `fn` implementations for scan, reverse, and merge, each with `requires`/`ensures`; prove composition lemmas with `proof fn`. For mutable arrays, the contract must also account for ownership and element permissions; an immutable `Seq` model often makes the first proof smaller.

evidence and limits

The paper reports that a successful SMT proof depends on specifications shaped for automation; teams sometimes changed the implementation (for example, a global result variable) without changing behavior (section 2.3, p. 6). This is evidence about proof engineering, not a claim that every representation is equivalent in effort. The asymmetric definition of monotonicity was chosen because comparing the first two elements determines the rest of a segment and makes invariants simpler (section 2.2, p. 5).

## technique 3: stack invariants for nearest-smaller values and Cartesian trees

what it is and when to use it

Challenge 2A computes each element’s nearest smaller value to the left with a stack. For each index, pop while the stack top is greater than or equal to the current value, use the remaining top as the left neighbor, and push the current index (Figure 3, section 3.1.1, p. 8). The three proof obligations are index order, smaller value, and absence of a smaller value between neighbor and current index. The paper states, "The invariant needed to prove the third verification task (smallest) depends on all values previously processed during the computation" (section 3.3, p. 10).

Part 2B builds a Cartesian tree from left and right nearest-smaller sequences. A node’s parent is its left neighbor when it lacks a right neighbor, its right neighbor when it lacks a left neighbor, the larger neighbor when it has both, and the root when it has neither (section 3.1.2, p. 9). Proofs target binary shape, heap order, and in-order traversal.

how to apply it

1. State stack representation and a predicate that every stack index is in the processed prefix (Figure 3, p. 8)
2. Preserve that stack order is increasing in the relevant monotonic sense while popping (section 3.1.1, p. 8)
3. After the pop loop, prove the top is the nearest smaller index, or that none exists
4. Push the current index and establish the loop invariant for the next input position
5. For the tree, compute left neighbors forward and right neighbors backward, then select parents by the four-case rule (section 3.1.2, p. 9)
6. Prove node uniqueness/binary structure, heap order, and finally the global in-order traversal; the report calls traversal the complex “big” invariant (section 3.4, p. 11)

Verus form

Inference: represent a stack as `Seq<int>` in the specification and a `Vec<usize>` in executable code. A `while` loop invariant can state prefix coverage and the stack ordering predicate; a lemma can show that popping preserves the nearest-smaller characterization. Represent parent, left-child, and right-child arrays with sequence models and prove tree properties as `spec fn`s. Traversal needs a recursive ghost predicate and a termination measure; use a decreasing argument in the proof, not an executable proof call.

evidence and limits

OpenJML completed all three nearest-smaller properties automatically once it supplied the loop invariants; its Z3 backend handled the complex third invariant (section 3.3, p. 10). The model-checking team completed the part under lists of at most six values, each from four possible values (section 3.3, p. 11). Coq teams made an off-by-one implementation error by popping the first qualifying stack entry, showing that a proof of only the first two properties can miss the “smallest” requirement (section 3.3, p. 10). These are concrete limits on specifications and bounded models.

## technique 4: relational refinement and nondeterministic-order reasoning for sparse parallel multiplication

what it is and when to use it

Challenge 3 stores nonzero matrix entries as sorted COO triples and accumulates `x[row] * value` into `y[column]` (Figure 5, section 4.1, p. 12). Participants must prove sequential functional correctness, absence of races/deadlocks, and equivalence of sequential and concurrent versions. The paper says, "The third challenge targeted the parallelization of a basic algorithm to multiply sparse matrices (where most values are zero)" (section 4, p. 12).

how to apply it

1. Specify COO-to-dense correspondence, including whether duplicate coordinates sum (section 4.3, p. 13)
2. Prove the sequential fold computes standard matrix multiplication
3. Add locks or atomic blocks around each output update and prove race freedom (section 4.1, p. 12)
4. To avoid reasoning about a fixed schedule, model processed entries as a set or multiset and prove that every order yields the same sum; Isabelle used a multiset to model nondeterministic order (section 4.3, p. 14)
5. Prove the concurrent result equals the sequential result, under explicit bounds if using a finite-state model checker

Verus form

Inference: use a Verus state machine or a lock/atomic protocol for ownership of output cells. Specify a ghost set or multiset of processed COO entries and an invariant equating each output component to the sum over that set. Use `atomic` blocks or a state-machine transition invariant for each update; prove commutativity/associativity assumptions for the numeric domain explicitly. A `Seq` model can express the sequential fold; it does not by itself prove thread interference safety.

evidence, trust, and threat

No team solved all of challenge 3. Six of 12 teams in the final session attempted only the sequential part, and three of six teams attempting concurrency completed the no-race task (section 4.3, p. 13). The model checker completed task 3 only with finite input and process bounds (section 4.3, p. 14). Team Coinductive Sorcery relied on unproved associativity assumptions for vector addition (section 4.3, p. 14). Inference: this is a substantial threat to agent-written verified Rust because concurrency proofs require a semantic model of synchronization and algebraic laws, not only local contracts.

## what is proved, what remains trusted, and reuse for VL

The event proves what each submitted tool and specification establishes; it does not validate that the natural-language challenge captures every desired property. Model-checking results are bounded, and SMT results depend on solver assumptions and supplied invariants. The report’s regression covers 21 challenges; it found that mutable input, outlined or recursive algorithms, and matrix inputs correlate with fewer complete solutions (section 5.3, pp. 17–18). Table 3 reports complete-solution percentages; for example, Monotonic segments and GHC sort had 85% partial and 15% complete, Cartesian trees 69% partial and 15% complete, and sparse matrix multiplication 85% partial and 0% complete, each denominator being participating teams for that challenge (Table 3, p. 17).

Inference: VL should use staged tasks, explicit denominator-labeled metrics, and challenge families covering arrays, recursive structures, and concurrency. It should record assumptions such as bounded domains, unproved algebraic laws, and omitted maximality. The report also says that high-level languages let teams focus on behavioral properties while low-level languages spend effort on memory separation (section 5.4, p. 18); this is directly relevant to deciding which Rust safety obligations Verus should discharge automatically.

## techniques for the catalog


- staged invariant strengthening — prove base bounds and functional properties, then add maximality with endpoint-specific invariants

- representation-aware refinement — choose arrays, immutable sequences, lists, or refinement predicates to match solver strengths

- stack nearest-smaller proof — maintain prefix, order, and nearest-smaller invariants across pop/push loops

- relational concurrency proof — model all processing orders with a set or multiset and prove equivalence to a sequential fold

- benchmark-based evaluation — compare tools with fixed time, challenge order, solution categories, and denominator-labeled results

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
