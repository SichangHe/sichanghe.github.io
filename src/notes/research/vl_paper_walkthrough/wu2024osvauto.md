# OSVAuto: automatic proofs about functional specifications in OS verification
(authored by agents unless marked 🧑)
Tag: `wu2024osvauto`, [paper](http://arxiv.org/abs/2403.13457v2)

## what the paper proves and measures

OSVAuto automates functional-specification proof obligations that occur in operating-system verification. It supports sequences, maps, structures, and enumerations, then reduces quantified goals to SMT formulas solved by Z3. The authors distinguish this from implementation refinement and separation logic: “In this paper, we focus on providing greater level of automation to the first part.” (Section 1, p.2) The first part is invariant preservation and refinement between functional abstraction levels; memory, aliasing, and concurrent separation logic remain outside the tool.

The core algorithm is sound but incomplete. The paper states, “Among the above steps, 1 and 3 preserve the satisfiability of the proof goal. In step 2, the choice of instantiation is heuristic, in the sense that it is not guaranteed that all necessary instantiations for the proof are found.” (Section 4, p.9) Inference: a successful OSVAuto result is a checked proof in the modeled language, but a failure does not show that the specification is false.

## technique 1: normalize rich functional specifications

what it is: rewrite a goal until only generalized atomic terms, primitive equalities, logical/arithmetic operators, if-then-else, and quantifiers remain. This removes domain-specific constructors and operations before SMT encoding.

when to use: use normalization when specifications contain nested sequences/maps, structure updates, enumerations, bounded quantifiers, function definitions, or non-basic sequence operations that the solver cannot consume directly.

how to do it:

1. expand all function and predicate definitions (Section 4.1, p.10)
2. expand general structure updates into basic structure, sequence, and map updates (Section 4.1, p.10)
3. turn generalized switch statements into if-then-else terms (Section 4.1, p.10)
4. replace top-level `let` terms with a fresh variable plus an equality; expand other lets (Section 4.1, p.10)
5. expand equality for structures, enumerations, sequences, and maps according to their definitions (Section 4.1, p.10)
6. move bounded-quantifier constraints into the body, prenex quantifiers, and skolemize outer existence facts (Section 4.1, p.10)
7. reduce non-basic sequence/map operations according to semantics, retaining conditions as if-then-else terms instead of splitting every case (Section 4.1, p.10)
8. use defining equations as rewrite rules after normalizing their indices and right sides (Section 4.1, p.10)

The paper's Example 2 turns equality of two `Shape` structures into field equalities and conditional length/element equalities, for example `s.id = t.id` and an implication that equal indexed fields hold when `s.id = 0` (Example 2, p.11). Theorem 1 says the resulting goal has only generalized atomic terms, constants, logical/arithmetic operators, and quantifiers (Section 4.1, p.10).

Verus form: Inference: write analogous `spec fn` definitions over `Seq`, `Map`, and Rust structs, then expose helper lemmas or `assert` rewrites that reduce structure equality and updates before solver calls. Verus does not provide OSVAuto's normalization pass as a single command; a Rust implementation would be a proof-producing preprocessing layer or manually authored proof lemmas. Keep `ensures` on executable functions and use `proof fn` for lemmas.

evidence and limits: Normalization preserves satisfiability by the paper's theorem and does not rely on heuristic instantiation. It assumes non-recursive data definitions in the later SMT encoding; recursive datatypes are outside the stated encoding model.

## technique 2: graph-based quantifier instantiation with conditions

what it is: build a classification graph whose nodes are bound variables or sequence/map terms and whose weighted edges arise from indexed appearances such as `a[i+c]`. Seed concrete indices from the goal and propagate them through edges, carrying path conditions. Propagation is stopped when conditions are inconsistent or heuristic cutoffs are reached.

when to use: use this for quantified invariants over array/sequence indices or map keys, especially nested sequences and maps where naive instantiation loops. It is aimed at OS obligations with bounded index quantification rather than arbitrary higher-order theorems.

how to do it:

1. create graph nodes for bound variables and sequence/map terms in quantified facts (Sections 2.1 and 4.2, pp.3,12)
2. add weighted edges from appearances; for `a[i+c]`, add an edge from `i` to `a` with weight `c` (Section 2.1, p.3)
3. seed instantiations from concrete indices in the goal, inequalities, and indexed terms (Sections 2.1 and 4.2, pp.3,12)
4. propagate forward and backward along weighted edges, substituting the current term for the bound variable (Section 4.2, p.12)
5. propagate between same-name sequence/map nodes, adding equality conditions for corresponding indices (Section 4.2, p.13)
6. conjoin propagated conditions with quantifier-free facts and ask the SMT backend whether they are inconsistent; discard inconsistent instantiations (Section 4.2, p.13)
7. remove one outer quantifier per round, preserve the graph across rounds, and continue until no useful instantiations remain (Section 4.2, p.13)
8. stop loops with per-round instantiation limits and a generation cutoff; experiments use generation cutoff `k = 2` (Section 4.2, p.13)

The paper's append example starts from `c = append(a,b)` and `d = append(b,a)`, reduces append indexing into cases, and propagates goal index `k` to `k+|a|` for the bound variable over `b`; the resulting implication is directly provable (Section 2.1, pp.3–4). In the nested-map variant, a nonzero graph cycle is shown spurious because propagation creates the contradictory condition `0 ≤ k + |g[0]| < |g[0]|`; inconsistency cuts the cycle (Example, Section 4.4, pp.15–16).

Verus form: Inference: this maps to targeted `assert`/`assert forall|i|` instantiations and lemmas over `Seq`/`Map`, with explicit bounds in `requires` and `ensures`. Verus's SMT solver can use triggers, but OSVAuto's graph and condition propagation are not built-in; implementing them would require a preprocessing tool that emits Verus proof obligations or selected quantified assertions. The generation cutoff and inconsistency test are engineering heuristics, not Verus language constructs.

evidence and limits: The algorithm is sound but not complete because instantiation is heuristic. The paper explicitly omits some initial instantiations (inequality-derived values, `−1`, and sequence lengths) because they are rarely useful in OS goals and can cause loops (Section 4.2, p.13). It also leaves completeness proofs for uniqueness and index-dependent properties as future work (Section 6, pp.17–18).

## technique 3: native SMT encoding of generalized atomic terms

what it is: after quantifier elimination, encode each generalized atomic name as an SMT variable or uninterpreted function rather than introducing a datatype plus quantified axioms. This avoids additional datatype axioms for field access and equality.

when to use: use this when normalized data structures are non-recursive and all generalized atomic terms have primitive types. It is useful for preserving solver tractability in nested OS state.

how to do it:

1. decompose each generalized atomic term into a name and index list, such as `m[k].pts[i].y` becoming a name plus indices (Sections 3.4 and 4.3, pp.8,14)
2. encode a name with no indices as an SMT variable; encode a name with indices as an uninterpreted function whose argument types are the index types (Section 4.3, p.14)
3. recursively encode each index and map logical/arithmetic operators to SMT operators (Section 4.3, p.14)
4. submit the resulting quantifier-free formula to Z3 (Section 4, p.9)

Example 3 encodes structure equality with variables `n1` through `n12`; indexed fields become uninterpreted functions such as `n5(i)`, and only versions with instantiated indices are sent in practice (Section 4.3, p.14).

Verus form: Inference: Verus already translates specs to SMT and supports uninterpreted-function reasoning internally, so a user normally writes the contract and lemmas rather than reproducing this encoding. A Verus extension could expose field/index abstractions as ghost specifications, but manually declaring uninterpreted functions would change the proof model and risk losing Rust datatype semantics. Preserve the concrete `Seq`, `Map`, and struct operations and let Verus own the encoding.

evidence and limits: The encoding relies on non-recursive datatype definitions and Theorem 1's primitive generalized atomic terms (Section 4.3, p.14). It is an abstraction of structure behavior; soundness depends on the normalization rules and the interpreted names/indices matching the specification.

## technique 4: push-button functional OS case study

what it is: state invariant and refinement-preservation goals, then let OSVAuto discharge all functional proof obligations automatically. The user supplies goals and specifications; auxiliary definitions and invariants are part of the input.

when to use: use it after expressing API behavior and state invariants in the supported language. It targets functional correctness of kernel APIs, not concurrent separation-logic implementation refinement.

how to do it:

1. model µC/OS-II APIs, high/low-level states, invariants, and refinement relations (Sections 2.2 and 5, pp.4–5,17)
2. express each API's invariant/refinement-preservation goal in OSVAuto's functional language (Section 5, p.17)
3. run normalization, graph instantiation, SMT encoding, and Z3 solving (Section 4, p.9)
4. inspect the automatically checked goals; no interactive proof steps are needed for the reported case study (Section 5, p.17)

Table 1 reports 58 goals over 901 specification/auxiliary lines and a total of 218.7 seconds: individual API totals include OSTaskSuspend 3 goals/2.3 s, OSSemPost 8/50.7 s, OSQPost 8/56.5 s, and auxiliary definitions/invariants 125+437 lines. The denominator is 58 proof obligations in this case study; all are reported automatically verified. The paper says, “We emphasize that all proof obligations are verified automatically, with the user only having to state goals on invariant and refinement preservation.” (Section 5, p.17)

Verus form: Inference: the corresponding VL workflow is to encode API behavior as Rust functions with `requires`/`ensures`, state invariants as `spec fn`, and preservation as `proof fn`s. Verus can check each obligation, but concurrency and ownership may require additional ghost state and invariants. OSVAuto's timing and 58-goal result do not predict Verus throughput.

## trusted boundary, failures, and product threat

OSVAuto's normalization and SMT encoding preserve satisfiability; quantifier instantiation is the incompleteness boundary. Z3, the specification language implementation, and the correctness of the translation from the functional model are trusted for the reported result. Inference: a VL product should treat OSVAuto's graph ideas as automation heuristics while retaining Verus's proof checker and separately validating that the functional specification matches the Rust implementation.

The case study does not verify the concurrent separation-logic layer; the authors say its combination is future work (Section 5, p.17). The algorithm cannot guarantee completeness for uniqueness or index-dependent map properties (Section 6, pp.17–18). Inference: the product threat from agent-written verified Rust is greatest when a quantifier-instantiation failure is mistaken for a false invariant, or when a solver-proved abstraction omits ownership, aliasing, interrupts, or memory behavior. Existing OSVAuto already covers the functional SMT stage; VL should not redo a generic sequence/map instantiation engine without first measuring whether Verus's own triggers and lemmas leave the same gap.

Inference: Table 1's listed API times sum to 218.7 seconds, matching its total; its goal counts sum to 58. The table therefore supports the stated 58-goal case-study denominator, while the paper gives no success denominator for obligations outside this selected set.

## techniques for the catalog

- normalization to solver primitives — expand rich structures, maps, sequences, and quantifiers into generalized atomic terms and basic operators
- condition-carrying graph instantiation — propagate index substitutions through weighted graph edges while pruning inconsistent paths
- uninterpreted-function SMT encoding — map normalized names and indices to primitive SMT variables/functions before solving
- automatic invariant/refinement discharge — run the pipeline on stated OS functional obligations without interactive proof steps

Checked 2026-10-15 against the paper by a Codex agent for osvauto_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
