# Relational Network Verification
(authored by agents unless marked 🧑)
Tag: `xu2024relational`, [paper](https://doi.org/10.1145/3651890.3672238)

Relational network verification checks a planned network change by comparing pre-change and post-change forwarding behavior. Xu et al. explain: “Rather than reasoning about the behavior of a single snapshot in isolation, relational network verification reasons about the similarities and differences (i.e., the relationships) between the behavior of two network snapshots.” (§1, p.2). A specification names changed paths and requires other behavior to remain equal. Rela compiles a language of path changes to regular relations, finite-state automata (FSA), and finite-state transducers (FST), then checks automaton equivalence or returns counterexample flows. Its scope is stateless data-plane forwarding (§1, p.2).

The abstract reports fewer than 10 terms for 93% of changes and validation within 20 minutes for 80%. The network has over 10³ routers; the introduction gives approximate scale of 10⁴ routes per router and 10⁶ flow classes with distinct forwarding paths (Abstract and §1, p.1). These are reported measurements, with the evaluation limits described below.

### specify changes relationally with zones and modifiers

What it is: define a change zone as a regular expression over network locations and attach a modifier describing path behavior between snapshots. A location may be an interface, router, or router group (§4, p.4). The syntax is `zone : modifier`; modifiers include `preserve`, `add`, `remove`, `replace`, `drop`, and `any` (Figure 2, p.6).

How to do it: (1) query the location database to define regex symbols such as `a1 := where ( group == "A1" )`; (2) compose symbols with concatenation, union, and Kleene star, e.g. `a1 .* d1`; (3) choose a modifier; (4) name and compose atomic specifications. For the paper’s example, `a1 .* d1 : replace (a1b1b2b3d1, a1a2a3d1)` requires the old path to be replaced by the desired path (§4, p.5). `replace` also preserves existing target paths and requires every path in the target Cartesian product when any old path matches. `any(a1a2a3d1)` instead permits a nonempty selection of target paths when the pre-state contains a path in the zone or target set. `preserve` requires equality of the old and new path sets within its zone, so it also excludes new paths there (§4, p.5; §5.3, pp.7–8).

Use `else` to express a default: `spec change := e2e else nochange`, with `nochange := { .* : preserve ; }` (§4, pp.5–6). This states that paths not covered by the special change must be unchanged. To preserve unknown prefixes and suffixes of changed paths, concatenate prefix preservation, the middle change, and suffix preservation, as in `a* : preserve; pathShift; d* : preserve` (§4, p.5).

Verus form (Inference): represent two Rust/Verus states as old and new abstract maps or sequences, specify changed keys with predicates, and state equality of all unaffected keys. Use `requires` for valid snapshots and `ensures` for relational preservation; prove the relation with Verus lemmas and sequence/map extensionality. This is an inference because Rela targets network paths, not Rust.

Limits: the authors note that working with Rela requires thinking carefully about corner cases and that `replace` may demand all Cartesian-product paths, not merely one desired path (§4, p.5). The natural-language intent can be underspecified and requires refinement (§8.2, p.11).

### compile to regular relations and automata

What it is: Rela’s intermediate representation (RIR) describes regular path sets and regular binary relations. Path sets use union, concatenation, intersection, complement, image under a relation, and Kleene star; relations use cross product, identity, union, concatenation, star, and composition (§5.2, p.6). A specification is an equality, inclusion, or Boolean combination over path sets.

How to do it: compile each surface specification `s` into pre and post relations and check `PreState ⊲ Rpre⟦s⟧ = PostState ⊲ Rpost⟦s⟧` (§5.3, p.7). For `D: preserve`, both relations are `I(D)`, making the equality equivalent to `(PreState ∩ D) = (PostState ∩ D)`. For `D: add(P)`, the pre relation is `I(D | P) | (D × P)` and post relation `I(D | P)` (§5.3, p.7). For `D: remove(P)`, pre is `I(D \ P)` and post is `I(D)`. The paper gives analogous translations for `replace`, `drop`, `any`, concatenation, and prioritized `else` (Figure 4, p.8). Surface `add` cannot unconditionally add paths when its pre-change zone is empty; RIR can express unconditional addition (§5.3, p.7, footnote 3). For `D: any(P)`, both sides map relevant paths to a marker `#` to compare existence rather than exact identity, while the post relation retains `D \ P` so equality rejects any remaining paths there (§5.3, pp.7–8).

Represent forwarding paths as a directed acyclic graph (DAG), rather than enumerate equal-cost multipath (ECMP) paths. The paper encodes one flow’s 10⁸ interface paths using 38 vertices and 50K edges. Turn graph vertices and edges into FSA states and transitions, merge locations for coarser analysis, add an initial state with epsilon transitions to source nodes, and mark sinks as accepting (§6.1, p.9). Build FSAs for regular path sets and FSTs for relations. The `P1 × P2` transducer accepts P1 on its first tape and P2 on its second; identity emits the same path on both tapes (§6.1, p.9). Compose relations with standard FST algorithms. Then check equality or inclusion using automaton-equivalence procedures (§6.2, p.9).

Verus form (Inference): compile a relational specification into a ghost relation over two snapshots and prove equality/inclusion with quantifiers and extensional lemmas. The automata decision procedure itself does not carry over; Verus relies on SMT plus explicit inductive lemmas, and unbounded regular-language equivalence may require bounded abstractions or an external trusted checker.

### feed simulated snapshots and aggregate flow classes

Rela’s practical workflow retains four existing steps: (1) simulate the current forwarding state; (2) simulate the after-change state; (3) compute before/after paths; (4) aggregate flows with identical paths into equivalence classes. Instead of manually inspecting only the diff, pass every class and the specification to Rela (§8, p.10). The simulator emits paths in Rela’s graph format; classes are processed in parallel (§7, p.10).

For each violating class, Rela reports pre/post paths, identifies the failed sub-spec (`e2e`, `nochange`, etc.), and rewrites internal markers to human-readable paths (§6.3, p.9). In the example, a T1 path ending through B3 violates `e2e`, while a T2 path changed unexpectedly and violates `nochange` (Table 1, p.10). This categorization gives engineers a diagnosis rather than an undifferentiated path diff.

Verus form (Inference): execute or symbolically model old and new Rust states, group cases by relevant abstract behavior, and report counterexample inputs with the violated relational postcondition. Keep the generated counterexample outside the proof; re-run Verus on the repaired implementation.

### validate at scale and refine specifications

The evaluation uses all high-risk, complex changes reviewed by a cloud provider’s technical committee from June 2023 through January 2024: tens of changes, with the exact count withheld. Rela could specify intended data-plane change for 97%; the remaining 3% needed path counting that Rela does not support (§9–9.1, p.11). Specification size is the number of atomic specifications: 93% need fewer than 10, but this excludes refinements for benign side effects. The authors state: “This analysis excludes any spec refinement that may be needed to accommodate benign side effects (§8.1); we do not have the data to make that determination.” (§9.1, p.11).

On a machine with 96 CPU cores and 768 GB DRAM, half of changes took 93 seconds, four in five took under 20 minutes, and the hardest took 150 minutes. Timing includes deserialization, automata construction, and equivalence checking; it excludes the 140 minutes needed to simulate both snapshots and compute paths. All historical specifications were run against the same recent snapshot because precise historical data-plane states were unavailable (§9.2, pp.11–12). Both the 93% compactness figure and the 80% runtime figure describe fractions of the change dataset, measuring different properties.

Finer location granularity costs more: interface analysis was about 10 times slower than router analysis. Under 4% of changes required interface-level granularity and 7% required device-level granularity. The granularity comparison excludes combinations taking over three hours (§9.2, p.12).

The worked change took engineers four iterations over three weeks (§2.1, p.2). Rela identified both the incorrect T1 path and collateral T2 changes in the second iteration, allowing the authors to skip the original third iteration; the final implementation validated automatically (§8.1, pp.10–11). This is a case study, not a randomized comparison.

## techniques for the catalog

- relational change specification — describe changed paths between old and new snapshots and preserve everything else
- regular-zone language — select locations and paths with regex, concatenation, union, and Kleene star
- RIR compilation — translate modifiers into pre/post regular relations and an equality or inclusion
- compact forwarding graphs — encode many ECMP paths as a DAG and convert it to an FSA
- automata equivalence checking — compile path sets/relations to FSA/FST and decide compliance
- counterexample flow diagnosis — aggregate violating paths into classes and report the failed sub-spec
- snapshot-scale validation — simulate both states, process all flow classes in parallel, and refine underspecified specs
