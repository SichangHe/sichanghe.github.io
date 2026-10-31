# OSVAuto: automatic proofs about functional specifications in OS verification
(authored by agents unless marked 🧑)
Tag: `wu2024osvauto`, [paper](http://arxiv.org/ps/2403.13457v2)

## what the paper proves and measures

OSVAuto automates functional-specification proof obligations that occur in operating-system verification. It supports sequences, maps, structures, and enumerations, then reduces quantified goals to SMT formulas solved by Z3. The authors distinguish this from implementation refinement and separation logic: “In this paper, we focus on providing greater level of automation to the first part.” (Section 1, p.2) The first part is invariant preservation and refinement between functional abstraction levels; memory, aliasing, and concurrent separation logic remain outside the tool.

The authors describe the core algorithm as sound but incomplete. The paper states, “Among the above steps, 1 and 3 preserve the satisfiability of the proof goal. In step 2, the choice of instantiation is heuristic, in the sense that it is not guaranteed that all necessary instantiations for the proof are found.” (Section 4, p.9) Inference: failure to prove a goal does not show that the specification is false.

## technique 1: normalize rich functional specifications

what it is: rewrite a goal until only generalized atomic terms, primitive equalities, logical/arithmetic operators, if-then-else, and quantifiers remain. A generalized atomic term starts from a variable and applies field accesses or basic sequence/map operations; indices and keys are unrestricted (Section 3.4, pp.8–9). Normalization removes domain-specific constructors and non-basic operations before SMT encoding.

when to use: use normalization when specifications contain nested sequences/maps, structure updates, enumerations, bounded quantifiers, function definitions, or non-basic sequence operations that the solver cannot consume directly.

how to do it:

1. expand all function and predicate definitions (Section 4.1, p.10)
2. expand general structure updates into basic structure, sequence, and map updates (Section 4.1, p.10)
3. turn generalized switch statements into if-then-else terms (Section 4.1, p.10)
4. replace top-level `let` terms with a fresh variable plus an equality; expand other lets (Section 4.1, p.10)
5. expand equality for structures, enumerations, sequences, and maps according to their definitions (Section 4.1, p.10)
6. move bounded-quantifier constraints into the body, prenex quantifiers, and skolemize outer existence facts (Section 4.1, p.10)
7. reduce non-basic sequence/map operations according to semantics, retaining conditions as if-then-else terms instead of splitting every case (Section 4.1, p.10)
8. recognize an equality as a defining equation when its left side is a generalized atomic term with no indices; normalize only its indices and right side, and use the equation to rewrite the rest of the goal (Section 4.1, p.10)

The paper's Example 2 turns equality of two `Shape` enumeration values into field equalities and conditional length/element equalities: `s.id = t.id`, matching lengths and indexed fields for branch 0, and matching point fields for branch 1 (Example 2, p.11). Theorem 1 says the resulting goal has only generalized atomic terms, constants, logical/arithmetic operators, and quantifiers (Section 4.1, p.10).

Verus form: Inference: an adaptation could use specification functions and helper lemmas to expose field equalities and simplify updates before solver calls. The paper does not evaluate a Verus adaptation.

evidence and limits: Section 4 states that normalization preserves satisfiability; Theorem 1 describes its resulting syntax. The language excludes recursive enumeration definitions and recursive functions. Maps represent finite partial functions with integer or bit-vector keys and unrestricted value types (Sections 3.1 and 3.3, pp.7–8).

## technique 2: graph-based quantifier instantiation with conditions

what it is: build a classification graph whose nodes are bound variables or sequence/map terms, with weighted edges for index offsets and pattern edges for more general indexed appearances. Seed indices from free indexed terms in assumptions or the goal and propagate them through edges, carrying conditions. Propagation is stopped when conditions are inconsistent or heuristic cutoffs are reached.

when to use: use this for quantified invariants over array/sequence indices or map keys, especially nested sequences and maps where naive instantiation loops. It is aimed at OS obligations with bounded index quantification rather than arbitrary higher-order theorems.

how to do it:

1. create a node for the outermost bound variable of each universally quantified fact and for each free generalized atomic sequence/map term in the current goal (Section 4.2, p.11)
2. for `a[i+c]` in the body quantified over `i`, add an edge from `i` to `a` with weight `c`; for `s[p(i)]` or `m[p(i)]`, add a pattern edge; attach occurrence conditions inherited from parent terms, adding `c` or `¬c` for branches of `if(c)` and `c` for the consequent of `c → t` (Section 4.2, pp.11–12)
3. seed indices or keys from free appearances of `a[i]`, `m[k]`, and `indom(k,m)` in assumptions or the goal, with their occurrence conditions; omit the inequality-derived and sequence-boundary seeds used in the earlier algorithm (Section 4.2, pp.12–13)
4. propagate instantiation `t` forward along a weight-`c` edge as `t+c`, substituting `i=t` in appended edge conditions; backward propagation produces `t-c` and substitutes `i=t-c` (Section 4.2, p.12)
5. along a pattern edge, match a sequence/map node's instantiation against `p(?i)` and propagate the matched value back to the bound-variable node, carrying the corresponding conditions (Section 4.2, pp.12–13)
6. propagate between same-name sequence/map nodes, adding equality conditions for corresponding indices (Section 4.2, p.12)
7. combine propagated conditions with quantifier-free facts and ask the SMT backend whether they are inconsistent; discard inconsistent instantiations (Section 4.2, p.13)
8. replace each quantified fact with its outermost-variable instances each round; preserve the graph and normalize new facts before further instantiation; encode only when no further instantiation can be performed (Sections 4 and 4.2, pp.9,13)
9. limit instantiations per round and term generations; original terms have generation 0, and terms first appearing in quantifier-free instances from generation `i` have generation `i+1`; generation-`k` terms are not added to the graph; experiments use `k = 2` (Section 4.2, p.13)

The paper's append example starts from `c = append(a,b)` and `d = append(b,a)`, reduces append indexing into cases, and propagates goal index `k` to `k+|a|` for the bound variable over `b`; the resulting implication is directly provable (Section 2.1, pp.3–4). In the nested-map variant, propagation creates `0 ≤ k + |g[0]| < |g[0]|`, contradicting the earlier condition `0 ≤ k`, and cuts a nonzero cycle (Section 4.4, p.15).

Verus form: Inference: an adaptation could select quantified instances over sequences and maps, keeping explicit index bounds and checking accumulated conditions before producing further instances. Its effectiveness in Verus would need separate evaluation.

evidence and limits: The algorithm is sound but not complete because instantiation is heuristic. The paper explicitly omits some initial instantiations (inequality-derived values, `−1`, and sequence lengths) because they are rarely useful in OS goals and can cause loops (Section 4.2, p.13). It also leaves completeness proofs for uniqueness and index-dependent properties as future work (Section 6, pp.17–18).

## technique 3: native SMT encoding of generalized atomic terms

what it is: after quantifier instantiation, encode each generalized atomic name as an SMT variable or uninterpreted function rather than introducing a datatype plus quantified axioms. This avoids additional datatype axioms for field access and equality.

when to use: use this when normalized data structures are non-recursive and all generalized atomic terms have primitive types. It is useful for preserving solver tractability in nested OS state.

how to do it:

1. decompose each generalized atomic term into a name and index list, such as `m[k].pts[i].y` becoming `(m.get.pts.index.y, [k,i])` (Sections 3.4 and 4.3, pp.9,14)
2. encode a name with no indices as an SMT variable; encode a name with indices as an uninterpreted function whose argument types are the index types (Section 4.3, p.14)
3. recursively encode each index and map logical/arithmetic operators to SMT operators (Section 4.3, p.14)
4. submit the resulting quantifier-free formula to Z3 (Section 4, p.9)

Example 3 encodes equality of `Shape` enumeration values using names `n1` through `n12`; `n5` through `n8` are uninterpreted functions, and only versions with instantiated indices are sent in practice (Section 4.3, p.14).

Verus form: Inference: a proposed encoding extension would need to preserve the meaning of field accesses and indices when converting them into SMT function applications. The paper provides no Verus implementation or comparison.

evidence and limits: The encoding relies on non-recursive datatype definitions and Theorem 1's primitive generalized atomic terms (Section 4.3, p.14). Section 4 states that encoding preserves satisfiability.

## technique 4: push-button functional OS case study

what it is: state invariant and refinement-preservation goals, then let OSVAuto discharge all functional proof obligations automatically. The user supplies goals and specifications; auxiliary definitions and invariants are part of the input.

when to use: use it after expressing API behavior and state invariants in the supported language. It targets functional correctness of kernel APIs, not concurrent separation-logic implementation refinement.

how to do it:

1. model µC/OS-II APIs, high/low-level states, invariants, and refinement relations (Sections 2.2 and 5, pp.4–5,17)
2. express each API's invariant/refinement-preservation goal in OSVAuto's functional language (Section 5, p.17)
3. run normalization, graph instantiation, SMT encoding, and Z3 solving (Section 4, p.9)
4. inspect the automatically checked goals; no interactive proof steps are needed for the reported case study (Section 5, p.17)

Table 1 (p.18) reports 58 goals over 901 lines of specifications, auxiliary definitions, and invariants, with a total of 218.7 seconds. Individual API totals include OSTaskSuspend 3 goals/2.3 s, OSSemPost 8/50.7 s, and OSQPost 8/56.5 s; auxiliary definitions and invariants occupy 125+437 lines. The denominator is 58 proof obligations in this case study; all are reported automatically verified. The paper says, “We emphasize that all proof obligations are verified automatically, with the user only having to state goals on invariant and refinement preservation.” (Section 5, p.17)

Verus form: Inference: an analogous workflow would express API behavior, state invariants, and preservation obligations in Verus. OSVAuto's timing and 58-goal result do not predict Verus throughput.

## techniques for the catalog

- normalization to solver primitives — expand rich structures, maps, sequences, and quantifiers into generalized atomic terms and basic operators
- condition-carrying graph instantiation — propagate index substitutions through weighted graph edges while pruning inconsistent paths
- uninterpreted-function SMT encoding — map normalized names and indices to primitive SMT variables/functions before solving
- automatic invariant/refinement discharge — run the pipeline on stated OS functional obligations without interactive proof steps
