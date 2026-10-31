# VerifyThis 2019: A Program Verification Competition (Extended Report)
(authored by agents unless marked 🧑)
Tag: `dross2020verifythis`, [paper](http://arxiv.org/abs/2008.13610v3)

## scope and result

The report describes a two-day, human-centred competition: 13 teams, 21 participants, and three 90-minute verification challenges. The paper says, "VerifyThis aims to bring together researchers and practitioners interested in formal verification, providing them with an opportunity for engaging, hands-on, and fun discussion" (section 1, p. 2). Its evidence is therefore both technical (algorithms, specifications, proofs) and empirical (submissions, interviews, and a regression over 21 historical challenges).

## technique 1: staged specification and invariant strengthening for monotonic segments

what it is and when to use it

Challenge 1A asks for an array scan that returns maximal monotonic cutpoints, then asks for progressively stronger properties. The paper defines four base properties: non-empty, begin-to-end, within bounds, and monotonic; maximality is an advanced strengthening. The authors give the algorithm as a single scan: maintain `x` and `y`, determine whether the current segment is increasing, advance while the relation remains unchanged, append `y`, then continue. The paper’s exact algorithm description is: "maximal monotonic cutpoints can be computed by scanning s once while storing every index that corresponds to a change in monotonicity (from increasing to decreasing, or vice versa)" (section 2.1.1, p. 4).

how to apply it

1. Represent the input sequence and cutpoints in the verifier’s convenient model; the organizers told participants they were free to choose any representation, listing “arrays, mathematical sequences, dynamic lists” (section 2.2, p. 6)
2. Prove non-empty, begin-to-end, and within-bounds properties for the result (verification task 1; properties defined in section 2.1.1, pp. 4–5)
3. Prove that every segment between adjacent cutpoints is monotonic, that is, strictly increasing or nonincreasing, without the maximality requirement (verification task 2; section 2.1.1, pp. 4–5)
4. Strengthen the predicate with maximality (verification task 3, marked “optional task (advanced)” with no formal definition given, section 2.2, p. 6) and prove that extending a segment makes it non-monotonic; teams typically stated maximality as two properties, to the right and to the left, and found explicit treatment of both preferable since the invariants are similar (section 2.4, p. 7)
5. Inference: add loop invariants relating processed indices, the current segment direction, and already emitted cutpoints. The paper does not list the invariants; it reports that incomplete proofs were missing them: one team “missed a few crucial invariants” (section 2.3, p. 6) and Team VerCors T(w/o)o “only missed a few key invariants” in the maximality proof (section 2.3, p. 7)

Verus form

Inference: encode the result as a `Seq<int>` or a vector model and write a `spec fn` for each property. A Rust loop can carry `invariant` clauses for bounds, the processed prefix, and the relation between the last cutpoint and the current scan index. Use `requires` for a sorted-domain assumption and `ensures` for the four properties plus maximality. Keep executable arrays separate from mathematical sequences, and use proof fns/lemmas to connect indexing facts. Do not treat `invariant` as a function call.

evidence and limits

The report records that Team OpenJML and Team The Refiners submitted complete, correct solutions of challenge 1; one more team got close but missed a few crucial invariants, five made substantial progress but introduced simplifying assumptions or skipped maximality, and five made more limited progress (section 2.3, p. 6). Team OpenJML’s implementation was very close to the pseudo-code of Figure 1 and it could “express and prove properties that directly translated all of the challenge’s verification tasks”; the paper adds that for SMT-based verifiers a proof depends on writing specifications in a form amenable to automated reasoning, and that the required loop invariants had a fairly clear connection to the postconditions (section 2.3, p. 6). Frama-C participants incurred extra memory-safety and separation obligations before functional properties (section 2.3, p. 7). Model checking required finite bounds on sequence length and values (section 2.3, p. 7). These denominators are teams in this 13-team event, not arbitrary programs.

## technique 2: refinement and representation choice for GHC sort

what it is and when to use it

Part 1B decomposes GHC sort into (1) split into monotonic segments, (2) reverse decreasing segments, (3) pairwise merge, and (4) repeat until one ordered sequence remains (section 2.1.2, p. 5). The merge algorithm preserves sortedness while consuming two sorted sequences. The paper’s concrete example sorts `3 2 8 9 3 4 5` as `3 2 | 8 9 | 3 4 5`, then `2 3 | 8 9 | 3 4 5`, then `2 3 8 9 | 3 4 5`, and finally `2 3 3 4 5 8 9` (section 2.1.2, p. 5).

how to apply it

1. Specify each helper (cutpoint construction, reversal, merge) before composing them; the paper’s Part B task 1 is to “Write functional specifications of all procedures/functions/main steps of your implementation” (section 2.1.2, p. 5)
2. Verify that merge returns a sorted sequence (Part B task 2, section 2.1.2, p. 5)
3. Verify that the overall algorithm returns a sorted output (task 3) that is a permutation of the input (task 4) (section 2.1.2, p. 5)
4. Inference: prove that reversing a decreasing segment yields an increasing segment; the paper lets Part B participants fold the reversal into the pass that builds the segments (section 2.2, p. 5) but states no separate reversal task
5. Inference: prove that pairwise merging preserves the multiset of values and sortedness, then use induction on the number of segments to establish the final sorted permutation; the paper does not describe this proof structure

For challenge 1, Team The Refiners used functional lists of lists for the segments and expressed the correctness properties recursively so that they were amenable to inductive proofs (section 2.3, p. 6); Team OpenJML stayed close to arrays and the pseudo-code. Isabelle’s refinement framework appears in the paper for challenges 2 and 3 (sections 3.3, p. 10, and 4.3, p. 14), not for challenge 1. Both teams using VerCors used immutable sequences instead of arrays to store cutpoints, which spared them dealing with permissions (section 2.3, p. 7).

Verus form

Inference: model permutation with a `Multiset` specification and sortedness with a quantified predicate over sequence indices. Use separate `fn` implementations for scan, reverse, and merge, each with `requires`/`ensures`; prove composition lemmas with `proof fn`. For mutable arrays, the contract must also account for ownership and element permissions; an immutable `Seq` model often makes the first proof smaller.

evidence and limits

The paper reports that a successful SMT proof depends on specifications shaped for automation; Team OpenJML took shortcuts, such as writing the result into a global variable instead of returning it, that “do not affect its behavior but are somewhat inelegant” (section 2.3, p. 6). Team Bashers’s explicit index representation of cutpoints “turned out not to be a good match for Isabelle’s functional programming features” (section 2.3, p. 6). Inference: representation choice affects proof effort, but the paper does not claim every representation is equivalent or measure the effort. The organizers chose the asymmetric definition of monotonicity because comparing the first two elements of a segment decides the direction of the rest, and it “seemed to require slightly simpler invariants” (section 2.2, p. 6); in the postmortem, teams did not find the asymmetry hard to work with (section 2.4, p. 7).

## technique 3: stack invariants for nearest-smaller values and Cartesian trees

what it is and when to use it

Challenge 2A computes each element’s nearest smaller value to the left with a stack. For each index, pop while the stack top is greater than or equal to the current value, use the remaining top as the left neighbor, and push the current index (Figure 3, section 3.1.1, p. 8). The three proof obligations are index order, smaller value, and absence of a smaller value between neighbor and current index. The paper states, "The invariant needed to prove the third verification task (smallest) depends on all values previously processed during the computation" (section 3.3, p. 10).

Part 2B builds a Cartesian tree from left and right nearest-smaller sequences. A node’s parent is its left neighbor when it lacks a right neighbor, its right neighbor when it lacks a left neighbor, the larger neighbor when it has both, and the root when it has neither (section 3.1.2, p. 9). Proofs target binary shape, heap order, and in-order traversal.

how to apply it

1. Choose a stack representation; the organizers let participants use an existing stack implementation or sequences as models of stacks (section 3.2, p. 9). Teams used a low-level array plus top index (OpenJML), lists with top and tail (Mergesort), logical axioms (Viper), or mathematical sequences (Sophie & Wytse) (section 3.3, pp. 10–11)
2. Inference: state a stack invariant that every stack index lies in the processed prefix and that stack values are ordered; the paper gives no such invariant
3. Inference: after the pop loop, prove the top is the nearest smaller index, or that none exists (this is verification task 3, “Smallest”, section 3.1.1, p. 8)
4. Inference: push the current index and re-establish the loop invariant for the next input position
5. For the tree, compute left neighbors forward and right neighbors backward, then select parents by the four-case rule (section 3.1.2, p. 9)
6. Prove the tree is well formed and binary with one node per value (task 1, Binary), that it has the heap property (task 2, Heap), and, as an optional task, that in-order traversal yields the input sequence (task 3, Traversal) (section 3.1.2, p. 9); the report says proving traversal “requires a complex ‘big’ invariant” (section 3.4, p. 11)

Verus form

Inference: represent a stack as `Seq<int>` in the specification and a `Vec<usize>` in executable code. A `while` loop invariant can state prefix coverage and the stack ordering predicate; a lemma can show that popping preserves the nearest-smaller characterization. Represent parent, left-child, and right-child arrays with sequence models and prove tree properties as `spec fn`s. Traversal needs a recursive ghost predicate and a termination measure; use a decreasing argument in the proof, not an executable proof call.

evidence and limits

OpenJML completed all three nearest-smaller properties automatically once it supplied the loop invariants; its Z3 backend handled the complex third invariant (section 3.3, p. 10). The model-checking team completed the part under lists of at most six values, each from four possible values (section 3.3, p. 11). Both Coq teams (and, as found after the competition, Team The Refiners) implemented an “off-by-one” version that also pops the first stack value satisfying s[y] < s[x]; this did not affect tasks 1 and 2, and the Coq teams did not notice it (section 3.3, p. 10). Inference: a proof of only the first two properties can miss such an error, which is why the third (smallest) property matters. These are concrete limits on specifications and bounded models.

## technique 4: relational refinement and nondeterministic-order reasoning for sparse parallel multiplication

what it is and when to use it

Challenge 3 stores nonzero matrix entries as sorted COO triples and accumulates `x[row] * value` into `y[column]` (Figure 5, section 4.1, p. 12). Participants must prove sequential functional correctness, absence of races/deadlocks, and equivalence of sequential and concurrent versions. The paper says, "The third challenge targeted the parallelization of a basic algorithm to multiply sparse matrices (where most values are zero)" (section 4, p. 12).

how to apply it

1. Specify COO-to-dense correspondence, including whether duplicate coordinates sum (section 4.3, p. 13)
2. Prove the sequential fold computes standard matrix multiplication
3. Add synchronization of the participant’s choice (the task lists “lock, atomic block”) and verify the absence of concurrency issues such as data races and deadlocks (verification task 2, section 4.1, p. 12); both VerCors teams used parallel loops with an atomic block around the output update (section 4.3, p. 14)
4. To avoid reasoning about a fixed schedule, model processed entries as a set or multiset so that the result does not depend on processing order. Team Viper tracked the set of processed elements with an axiomatized summation function, Team The Refiners’ Isabelle model took a multiset as input, whose elements are processed in nondeterministic order, and Team Coinductive Sorcery compared the COO-list version with a binary-tree version (section 4.3, p. 14)
5. Prove the concurrent result equals the sequential result, under explicit bounds if using a finite-state model checker

Verus form

Inference: use a Verus state machine or a lock/atomic protocol for ownership of output cells. Specify a ghost set or multiset of processed COO entries and an invariant equating each output component to the sum over that set. Use atomic operations with ghost state or a state-machine transition invariant for each update; prove commutativity/associativity assumptions for the numeric domain explicitly. A `Seq` model can express the sequential fold; it does not by itself prove thread interference safety.

evidence, trust, and threat

No team solved all of challenge 3. Six of 12 teams in the final session attempted only the sequential part, and three of six teams attempting concurrency completed the no-race task (section 4.3, p. 13). The model checker completed task 3 only with finite input and process bounds (section 4.3, p. 14). Team Coinductive Sorcery relied on unproved associativity assumptions for vector addition (section 4.3, p. 14). Inference: this is a substantial threat to agent-written verified Rust because concurrency proofs require a semantic model of synchronization and algebraic laws, not only local contracts.

## techniques for the catalog

- staged invariant strengthening — prove base bounds and functional properties, then add maximality with endpoint-specific invariants

- representation-aware refinement — choose arrays, immutable sequences, lists, or refinement predicates to match solver strengths

- stack nearest-smaller proof — maintain prefix, order, and nearest-smaller invariants across pop/push loops

- relational concurrency proof — model all processing orders with a set or multiset and prove equivalence to a sequential fold

- benchmark-based evaluation — compare tools with fixed time, challenge order, solution categories, and denominator-labeled results
