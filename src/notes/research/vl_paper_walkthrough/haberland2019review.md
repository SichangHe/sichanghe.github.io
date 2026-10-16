# Review of Recent Heap Specification and Verification Techniques
(authored by agents unless marked 🧑)
Tag: `haberland2019review`, [paper](http://arxiv.org/abs/1910.10176v2)

## scope and evidence
This is a survey, not a new verifier evaluation. Its abstract says: “The article provides an overview of the existing methods of dynamic memory verification; a comparative analysis is carried out.” It discusses Hoare calculus, transforming heaps into stacks, shape analysis, pointer rotation, and separation logic (Abstract, p. 1). It gives examples and rules rather than a controlled benchmark; no aggregate accuracy, runtime, or proof-size denominator is reported. Inference: statements below describe methods as presented by the survey and should not be read as new experimental evidence.

The survey identifies five recurring heap problems: memory leakage, inaccessible heap, invalid heap access, deviation between expected and actual structures, and aliasing/remote alteration (Section II, p. 2). It also warns that a Hoare triple is undefined for nontermination and that choosing a loop invariant is a central practical difficulty (Section III, pp. 4–5). Inference: these are immediate review targets for verified Rust APIs, where ownership and allocation contracts must cover both safety and termination assumptions.

## technique 1: Hoare triples and loop invariants

What it is. A Hoare triple `{P} C {Q}` states that command `C` transforms states satisfying precondition `P` into states satisfying postcondition `Q`. The survey writes: “A Hoare triple is interpreted as a predicate” and explains that the predicate is proper when the precondition holds, `C` runs, and `Q` succeeds (Section III, p. 4).

How to apply it.
1. Define the state assertion `P` over variables, pointers, and heap cells before the command.
2. Break a sequence into assignments, conditionals, procedure calls, and loops, applying the corresponding rule.
3. For a loop `while e do S od`, choose an invariant `p`, prove `{p ∧ e} S {p}`, and establish `p` initially; on exit derive `p ∧ ¬e` (the displayed loop rule, Section III, p. 5).
4. Use consequence to strengthen or weaken assertions and procedure rules to compose calls.
5. For a pointer algorithm, include ownership and alias facts in `P`, preserve them in `p`, and state the postcondition about reachability or shape.

Verus form (Inference). Use `requires` for `P`, `ensures` for `Q`, and a Rust `while` invariant for `p`; express heap shape with `spec fn` predicates and ownership through Verus permissions. Verus can prove partial correctness of terminating executions, but a termination argument needs a decreases clause or separate reasoning. Do not put `ensures` on a `spec fn`.

The survey’s limitation is explicit: “One such problem is the guessing of the right loop invariant” (Section III, p. 5). It also reports that dynamic-memory variables systematically damage completeness across the surveyed calculi. Inference: invariant synthesis and alias management are product risks when agents generate proof annotations.

## technique 2: transform heap algorithms into stack or region models

What it is. Rewrite pointer-heavy heap code into stack-like regions so analysis can use simpler, lexically scoped storage. The survey calls this “a prominent technique” and says its motivation is that pointers are often too hard to analyse and garbage collection may otherwise consume resources (Section IV, p. 5).

How to apply it.
1. Identify objects whose lifetimes and maximum sizes can be bounded statically.
2. Replace heap allocation and pointer links with stack or region allocation while preserving the abstract data structure.
3. Re-express pointer operations as local variable updates and prove the transformation’s correspondence.
4. Check performance and stack-window limits; the survey notes that stack allocation may bloat stack pages and that unknown final sizes favor the heap.
5. Reject the transformation when unrestricted aliasing or dynamic size makes the stack model invalid.

Verus form (Inference). Model a region as a ghost ownership domain and prove that each reference is created and dropped within the region lifetime; use Rust lifetimes where they match the algorithm. Verus does not automatically transform heap code, so the rewritten implementation and a refinement lemma are required.

The survey reports no universal speed result; it cites examples where stack allocation loses performance and states that whether a successful transformation is possible cannot be determined a priori (Section IV, pp. 5–6). Inference: VL should treat stackification as an optional design transformation, not a default verification tactic.

## technique 3: shape analysis and alias classification

What it is. Shape analysis abstracts pointer graphs into shapes and transfer functions. The survey describes transfer functions for an empty shape, field assignment, and heap allocation, and cites classifications of pointer relations as aliasing, non-aliasing, and possibly aliasing (Section V, pp. 6–7).

How to apply it.
1. Choose an abstract shape domain (lists, trees, or general graphs) and label pointer relations.
2. Build an initial abstract graph from allocations and roots.
3. For each statement, apply a transfer function that updates fields, allocates nodes, or changes aliases.
4. Join branch results conservatively; retain “possibly aliasing” when paths disagree.
5. Prove the target property on the abstract graph, then inspect approximation-induced imprecision. The survey notes that non-deterministic approximation choices can lead to unsound reasoning if the join is selected incorrectly (Section V, p. 7).

Verus form (Inference). Encode the abstract graph as ghost sequences/maps and maintain correspondence predicates between concrete references and abstract nodes. Use explicit branch invariants and prove that joins over-approximate reachable shapes. This is a modeling layer around Verus, not a built-in analysis.

## technique 4: pointer rotation as a verified primitive

What it is. Pointer rotation replaces error-prone assignments with named operations such as `rotL(x,x.next,y)` or `slide(x,y)`. The survey says: “The objective of any rotation or translation is to replace error-prone individual code with well-known stable operations” (Section VI, p. 7).

Apply it by defining the rotation’s precondition (distinctness/alias cases and valid links), its postcondition (which pointers move and which heap cells remain), and algebraic inverse laws. The survey shows linked-list reversal rewritten as a loop invoking `rotL`, then warns that “rotate(y, y.next)” can delete the first element in many configurations; Suzuki’s proposed safe subsets are not fully defined (Section VI, pp. 7–8).

Verus form (Inference). Implement a small Rust helper with `requires` for pointer validity and alias exclusions, `ensures` for the exact successor relation, and a loop invariant describing the reversed prefix. Keep the helper’s proof in a `proof fn` and test corner cases separately; an `external_body` helper would leave the key mutation unproved.

## technique 5: separation logic and framing

What it is. Separation logic uses predicates over heaps and the spatial conjunction `⋆` to describe disjoint heap components. The survey gives the inductive binary-tree predicate `btree(l) ::= nil | ∃x,y. l↦x,y ⋆ btree(x) ⋆ btree(y)` (Section VII, p. 8). It lists compactness, commutativity, associativity, neutral-element, distributivity, and quantification laws for `⋆`.

Apply it by defining inductive predicates for data structures, proving a local triple for the footprint, then framing untouched heap with `{P ⋆ F} C {Q ⋆ F}`. The survey explains: “when a subprocedure call C does not change a heap component, namely it includes frame F, then the antecedent is sufficient to prove in order to show the Hoare triple holds without F” (Section VII, p. 8). Fold/unfold recursive predicates around field accesses and use separating implication for resource transfer.

Verus form (Inference). Encode each inductive shape as a `spec fn` over a ghost sequence/map and use ownership permissions to state disjointness. Frame facts become unchanged-region clauses in `ensures`; recursive fold/unfold becomes `proof fn` lemmas. Verus’s ownership model differs from the survey’s `⋆`, so equivalence requires explicit correspondence proofs.

## limitations and VL threat
The survey itself lists open gaps: predicates may require manual fold/unfold, proof automation is difficult, varying objects are not recognized, and “hot” self-modifying code is unlikely to be handled (Section VIII, pp. 8–9). It supplies no measured comparison across tools. Inference: the direct threat to agent-written verified Rust is specification incompleteness around aliases, region lifetimes, and mutation corner cases; VL should reuse mature separation-logic framing ideas and spend effort on invariant/lemma generation and counterexamples rather than reimplementing a broad survey taxonomy.

## techniques for the catalog
- Hoare loop invariants — prove a stable assertion before and after every loop iteration
- heap-to-stack transformation — rewrite bounded heap lifetimes into stack or region storage when aliases and sizes permit
- abstract shape and alias analysis — propagate conservative graph shapes and alias classes through transfer functions
- pointer-rotation primitives — encapsulate list mutations in specified rotation operations with explicit corner-case preconditions
- separation-logic framing — describe disjoint heap predicates and preserve untouched resources with the frame rule
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
