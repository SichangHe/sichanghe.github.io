# Review of Recent Heap Specification and Verification Techniques
(authored by agents unless marked 🧑)
Tag: `haberland2019review`, [paper](http://arxiv.org/abs/1910.10176v2)

## scope and evidence
This is a survey, not a new verifier evaluation. Its abstract says: “The article provides an overview of the existing methods of dynamic memory verification; a comparative analysis is carried out.” It discusses Hoare calculus, transforming heaps into stacks, shape analysis, pointer rotation, and separation logic (Abstract, p. 1). It gives examples and rules rather than a controlled benchmark; no aggregate accuracy, runtime, or proof-size denominator is reported. The only figures are second-hand and unsupported by a table, such as Pavlu's path optimisation reducing "the overall calculation by approximately 90%" (Section V, p. 8). Inference: statements below describe methods as presented by the survey and should not be read as new experimental evidence.

The survey identifies five recurring heap problems: memory leakage, inaccessible heap, invalid heap access, deviation between expected and actual structures, and aliasing/remote alteration (Section II, p. 2). It also says that "In case C does not terminate, the Hoare triple is undefined" (Section III, p. 5) and lists "the guessing of the right loop invariant" as one theoretical boundary to verification rules (Section III, p. 6). Inference: these are immediate review targets for verified Rust APIs, where ownership and allocation contracts must cover both safety and termination assumptions.

## technique 1: Hoare triples and loop invariants

What it is. A Hoare triple `{P} C {Q}` states that command `C` transforms states satisfying precondition `P` into states satisfying postcondition `Q`. The survey writes: “A Hoare triple is interpreted as a predicate” and explains that the predicate is proper when the precondition holds, `C` runs, and `Q` succeeds (Section III, p. 5).

How to apply it (steps 1-4 follow the survey's description of proof search and its rule set; step 5 is Inference).
1. State `P` and `Q` as formulae over the calculation state; the survey says there "must be references to symbols in the calculation state, variables and symbols in C" (Section III, p. 5).
2. Proof starts from the consequent and breaks `C` down until the remaining statement is empty or basic, ending in axioms (Section III, pp. 5–6). The survey's rule set has assignment (ASN), composition (COMP1, COMP2), conditional (COND), loop (WHILE), consequence (CONSEQ), and procedure rules (CALL, VSUB, PSUB) (Section III, p. 6).
3. For a loop `while e do S od`, the displayed rule is `{p ∧ e}S{p}` over `{p}while e do S od{p ∧ ¬e}`: choose an invariant `p`, prove the body preserves it, and conclude `p ∧ ¬e` on exit (Section III, p. 6).
4. Use CONSEQ to strengthen or weaken assertions.
5. Inference: for a pointer algorithm, include ownership and alias facts in `P`, preserve them in `p`, and state the postcondition about reachability or shape. The survey does not give this recipe; it only says P and Q describe the calculation state.

Verus form (Inference, not from the survey and not checked against Verus documentation here). Use `requires` for `P`, `ensures` for `Q`, and a Rust `while` invariant for `p`; express heap shape with `spec fn` predicates and ownership through Verus permissions. The survey says a triple is undefined when `C` does not terminate, so a termination argument (for example a `decreases` clause) should be planned separately. Do not put `ensures` on a `spec fn`.

The survey’s limitation is explicit: “One such problem is the guessing of the right loop invariant” (Section III, p. 6). It also reports that "variables in dynamic memory are a systematical damaging criterion upon all calculi considered yet" (Section III, p. 7); it does not use the word completeness for that claim. Inference: invariant synthesis and alias management are product risks when agents generate proof annotations.

## technique 2: transform heap algorithms into stack or region models

What it is. Rewrite pointer-heavy heap code into stack-like regions so analysis can use simpler, lexically scoped storage. The survey calls this “a prominent technique” and says its motivation is that pointers are often too hard to analyse and garbage collection may otherwise consume resources (Section IV, p. 7). Appel [7] is cited as showing "Scenarios are shown where garbage collection is faster than automated stack management" (Section IV, p. 7).

How to apply it (steps 1-3 follow the survey; steps 4-5 summarise its stated drawbacks).
1. Accommodate the heap data structure in a stack window instead ("Transforming a heap means any data structure from the heap shall be accommodated to a stack window instead", Section IV, p. 8).
2. Codify object dependencies in the stack "by additional constraints"; for a singly-linked list, consecutive elements get ascending indices, and doubly-linked lists are handled the same way (Section IV, p. 8). Inserting or removing an element can change the window considerably, and trees and graphs need "proper stackinisation" (Section IV, p. 8).
3. Region Calculus [8] is named as a special case: class objects are assigned onto the heap "as it were locals in a stack window", so they are managed automatically; the stack window size is precalculated from the statically known class type (Section IV, p. 8).
4. Check cost: the survey says stack allocation using `calloc` "may reserve several kilobytes on the stack", which may bloat stack windows and make the OS spread pages more often (Section IV, p. 8).
5. The survey says dynamic data structures are preferred when final runtime sizes are unknown, and unrestricted heap manipulations cannot always be transferred to the stack (Section IV, p. 8). Inference: reject the transformation in those cases.

Verus form (Inference, not from the survey). Model a region as a ghost ownership domain and prove that each reference is created and dropped within the region lifetime; use Rust lifetimes where they match the algorithm. Verus does not automatically transform heap code, so the rewritten implementation and a refinement lemma are required.

The survey reports no measured speed result of its own. It says "Rewriting a heap algorithm into a stack-based algorithm shows poorer runtime characteristics for widely popular data structures", and concludes Meyer's proposal (storing all objects in the stack) "shall be considered with high reservations only"; it also says "Whether a successful transformation into a stack of objects is not possible to determine apriori" (Section IV, p. 8). A later paragraph lists limits of the functional variant: no lists may be returned and stack regions are often too large and coupled with other objects (Section IV, p. 8). Inference: VL should treat stackification as an optional design transformation, not a default verification tactic.

## technique 3: shape analysis and alias classification

What it is. Shape analysis abstracts pointer graphs into shapes and transfer functions. The survey says the main goal is "the detection of heap invariants (shapes), which may further be used for alias analysis", describes transfer functions such as "shape is empty", assigning a field member or pointer, and allocating a new heap, and cites Sagiv [47] for classifying pointer relations as "aliasing", "non-aliasing", and "possibly aliasing" (Section V, p. 8).

How to apply it (Inference: the survey describes the ideas but gives no step-by-step procedure; the steps are assembled from them).
1. Choose an abstract shape domain (lists, trees, or general graphs) and label pointer relations.
2. Build an initial abstract graph from allocations and roots.
3. For each statement, apply a transfer function that updates fields, allocates nodes, or changes aliases.
4. Join branch results conservatively; retain “possibly aliasing” when paths disagree.
5. Prove the target property on the abstract graph, then inspect approximation-induced imprecision. The survey, citing Pavlu [38], says [47] and [48] "may conclude in unsound reasoning" due to non-deterministic choices on approximation: if one branch gives "possibly aliasing" and the other "aliasing", the method ends with "aliasing" although "possibly aliasing" is right (Section V, p. 8). It also lists limits of [47] and [48]: pointers may only be indexed in non-variable expressions, and pointers to class objects, dynamic-length arrays, and `union`-style sharing are forbidden (Section V, p. 8).

Verus form (Inference, not from the survey). Encode the abstract graph as ghost sequences/maps and maintain correspondence predicates between concrete references and abstract nodes. Use explicit branch invariants and prove that joins over-approximate reachable shapes. This is a modeling layer around Verus, not a built-in analysis.

## technique 4: pointer rotation as a verified primitive

What it is. Pointer rotation replaces error-prone assignments with named operations such as `rotL(x,x.next,y)` or `slide(x,y)`. The survey says: “The objective of any rotation or translation is to replace error-prone individual code with well-known stable operations” (Section VI, p. 9).

Inference: apply it by defining the rotation’s precondition (distinctness/alias cases and valid links), its postcondition (which pointers move and which heap cells remain), and algebraic inverse laws. The survey shows the linked-list reversal loop of Section I rewritten as `while (x!=NULL) rotL(x,x.next,y);` and gives the inverse law `rotL⁻¹(x, x.next, y) ≡ rotL(x.next, x, y)` (Section VI, p. 9). It warns that "Let us consider rotate(y, y.next). This example deletes the first element in many configurations", and that a tiny change in the call parameters can give unpredictable behaviour. Suzuki [52] suggests "base rotations" as safe subsets, "without explicitly describing what ‘base’ really denotes" (Section VI, p. 9). The survey also says pointer rotation "does not need garbage collection" (Section VI, p. 9).

Verus form (Inference, not from the survey). Implement a small Rust helper with `requires` for pointer validity and alias exclusions, `ensures` for the exact successor relation, and a loop invariant describing the reversed prefix. Keep the helper’s proof in a `proof fn` and test corner cases separately; an `external_body` helper would leave the key mutation unproved.

## technique 5: separation logic and framing

What it is. Separation logic uses predicates over heaps and the spatial conjunction `⋆` to describe disjoint heap components. The survey gives the inductive binary-tree predicate `btree(l) ::= nil | ∃x,y. l↦x,y ⋆ btree(x) ⋆ btree(y)` (Section VII, p. 10; the survey writes it as `btree(l) ::= nil | ∃x.∃y : l ↦ x, y ⋆ btree(x) ⋆ btree(y)`). It lists, after Reynolds [53] and Berdine [54], compactness, commutativity, associativity, neutral-element, distributivity, and quantification laws for `⋆` (Section VII, pp. 9–10). It also notes that thinning does not hold in SL, so a heap may not repeat (Section VII, p. 10).

The frame rule is given as `{P}C{Q}` over `{P ⋆ F}C{Q ⋆ F}`. The survey explains: “when a subprocedure call C does not change a heap component, namely it includes frame F, then the antecedent is sufficient to prove in order to show the Hoare triple holds without F” (Section VII, p. 10). Inference: apply it by defining inductive predicates for data structures, proving a local triple for the footprint, then framing the untouched heap. The survey says predicates outside built-in tactics are "manually folded and unfolded" (Section VIII, p. 10); it does not discuss separating implication.

Verus form (Inference, not from the survey). Encode each inductive shape as a `spec fn` over a ghost sequence/map and use ownership permissions to state disjointness. Frame facts become unchanged-region clauses in `ensures`; recursive fold/unfold becomes `proof fn` lemmas. Verus’s ownership model differs from the survey’s `⋆`, so equivalence requires explicit correspondence proofs.

## limitations and VL threat
The survey itself lists open gaps: the models "do not recognise varying objects in structures", predicates excluded by built-in tactics are "manually folded and unfolded" and proof automation is suggested as research because "proof generation seems to be a complex problem", and "hot" code (code altered during execution) "is unlikely to be considered" (Section VIII, pp. 10–11). It also lists the absence of generalised counter-example generation (item 4, Section VIII, p. 11). It supplies no measured comparison across tools. Inference: the direct threat to agent-written verified Rust is specification incompleteness around aliases, region lifetimes, and mutation corner cases; VL should reuse mature separation-logic framing ideas and spend effort on invariant/lemma generation and counterexamples rather than reimplementing a broad survey taxonomy.

## techniques for the catalog
- Hoare loop invariants — prove a stable assertion before and after every loop iteration
- heap-to-stack transformation — rewrite bounded heap lifetimes into stack or region storage when aliases and sizes permit
- abstract shape and alias analysis — propagate conservative graph shapes and alias classes through transfer functions
- pointer-rotation primitives — encapsulate list mutations in specified rotation operations with explicit corner-case preconditions
- separation-logic framing — describe disjoint heap predicates and preserve untouched resources with the frame rule
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Pavlu [38] notes that both approaches, [47] and [48], may conclude in unsound reasoning for a given program due to non-deterministic choices to be made on approximation."): read all 12 pages of the text (two-column, interleaved; sections I-VIII and references); checked every quotation, section and page reference, the Hoare, stack, shape, rotation and separation-logic descriptions, and the limitations list against the paper. Changed: page numbers (the PDF has 12 pages, so Section III is pp. 5-7, IV pp. 7-8, V pp. 8-9, VI p. 9, VII pp. 9-10, VIII pp. 10-11); removed the claim that dynamic-memory variables damage "completeness" (paper says "damaging criterion upon all calculi"); removed "separating implication" (not in the paper); replaced invented technique 2 and 3 steps with the survey's own content and marked remaining recipe steps and all Verus mappings as Inference. Not checked: the Verus claims (no Verus documentation consulted), the cited references' own content, the figures and code listings (read from text only, not rendered).
