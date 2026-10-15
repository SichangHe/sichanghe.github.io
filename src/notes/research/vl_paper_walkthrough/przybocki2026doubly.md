# Doubly Saturated Ramsey Graphs: A Case Study in Computer-Assisted Mathematical Discovery
(authored by agents unless marked 🧑)
Tag: `przybocki2026doubly`, [paper](http://arxiv.org/abs/2604.21187v1)

## scope and results

The paper studies doubly saturated Ramsey-good graphs: a graph with no `K_s` and no independent set of size `t`, where adding or removing any edge destroys that property. Its main proved result is an infinite family: for every `t ≥ 4`, a doubly saturated `R(4,t)`-good graph on `6t−11` vertices. The abstract describes the workflow as “combining SAT solving with bespoke LLM-generated code to discover infinite families of such graphs” and says that LLMs were used “to generate and formalize correctness proofs in Lean” (Abstract, p. 1). The mathematical theorem is a useful case study in turning finite computation into a general construction and then checking the proof in a proof assistant.

Inference: for VL, the transferable lesson is the separation of discovery, executable search, conjecture formation, informal proof, and machine-checked proof. The paper does not verify Rust programs and does not establish that an LLM-generated proof is safe without Lean checking.

## technique 1: compact SAT encoding of double saturation

What it is. For parameters `s,t,n`, the authors construct a CNF formula satisfiable exactly when a doubly saturated `R(s,t)`-good graph on `n` vertices exists. Edge variables `e_{i,j}` represent graph edges. The no-clique and no-independent-set constraints are direct clauses over every `s`- and `t`-vertex subset. The paper states, “To encode that the graph contains no s-clique, we use the following clauses” (Section 2, p. 6), and notes that direct Ramsey-goodness uses `C(n,s)+C(n,t)` clauses (the extracted text prints these binomial terms in interleaved notation).

How to do it.
1. Create one Boolean edge variable for each unordered pair of vertices (Section 2, p. 6).
2. For each `s`-subset, add a clause forbidding all its pair edges simultaneously; do the analogous encoding for each `t`-subset's independent set (Section 2, p. 6).
3. Add one clause requiring at least one edge and one requiring at least one non-edge, excluding complete and empty graphs (Section 2, p. 6).
4. Encode maximality: for every non-edge `{i,j}`, require `s−2` common vertices that are pairwise adjacent and adjacent to both endpoints. Introduce auxiliary `p_{i,j,k}` variables, implication clauses for endpoint adjacency and pairwise adjacency, and an `AtLeast_{s−2}` cardinality constraint (Section 2, pp. 6–7).
5. Encode minimality analogously for every edge, requiring an independent witness set of size `t−2` (Section 2, p. 6).
6. Encode each cardinality constraint with Sinz's sequential-counter encoding through PySAT (Section 2, p. 7). The paper says this gives `O(n^4)` clauses for fixed `s,t` (Section 2, p. 7).
7. Add lexicographic symmetry-breaking constraints between each pair of vertex rows. The recursive encoding adds `(a_1 ∨ b_1)`, a variable for `(a_1 ↔ b_1)` enforced by four clauses, then guards the recursively encoded suffix (Section 2, p. 7).

When to use it. Use this encoding when small instances are hard to enumerate but local forbidden-pattern witnesses can be expressed with Boolean variables. The paper reports that the compact `O(n^4)` saturation encoding makes larger searches feasible, while direct encodings become unwieldy for large `t` because independent-set clauses dominate (Section 3, p. 8).

Verus form. Inference: represent an adjacency matrix as a `Vec<Vec<bool>>` or fixed-size bit-vector, and state graph predicates as `spec fn`s. A Verus proof can establish that each generated witness set satisfies adjacency and cardinality conditions using `requires` and `ensures`; loop-based clause generation uses `invariant` to preserve coverage. Verus will not execute a SAT solver as a proof step by itself. Treat a solver-produced assignment as input and verify its certificate or independently check the graph predicate in a `proof fn`.

Evidence and limits. CaDiCaL found no doubly saturated `R(4,5)` graph on 18 or fewer vertices, but did not terminate after a day on 19 vertices on one core; a circulant ansatz then found a 19-vertex solution (Section 3, p. 8). These are search outcomes, not proofs of nonexistence unless the solver run is independently certified. The paper does not report a complete clause count for each instance, so the asymptotic `O(n^4)` claim should not be read as a measured runtime bound.

## technique 2: computation-to-conjecture-to-construction

What it is. The authors use SAT for small cases, ask an LLM to generate bespoke search code when SAT becomes unwieldy, normalize isomorphic circulant distance sets, and ask the LLM to infer a general pattern. The paper says, “ChatGPT realized that when specifying a circulant graph, there are many distance sets that result in isomorphic graphs” (Section 3, p. 8).

How to do it.
1. Search small `n` with the SAT encoding and record satisfying graphs and isomorphism classes (Sections 2–3, pp. 6–8).
2. Restrict to circulant graphs when general SAT does not finish; generate code that searches distance sets for each parameter (Section 3, p. 8).
3. Ask the LLM to canonicalize equivalent distance sets and inspect additive patterns (Section 3, p. 8).
4. Infer the family `n=6t−11` and distance set `{1} ∪ {m in [floor(n/2)] | m ≡ 3,4 (mod 6)}`; then simplify it using `m=t−2` to `{m} ∪ [2m+1,3m]` (Section 3, p. 8).
5. Replace computational evidence with a human-readable proof and later formalize that proof (Sections 3 and 5, pp. 8–9).

The resulting proof checks four obligations: clique number below four, independence number below `t`, every added edge creates `K4`, and every removed edge creates an independent `t`-set (Section 3, p. 9). For example, the clique argument uses cyclic gaps summing to `n=6m+1`; at least three gaps must equal `m`, forcing adjacent gaps summing to `2m`, which is outside the distance set (Section 3, p. 9). The independent-set argument shifts one vertex to zero and applies a pigeonhole argument over two allowed distance intervals (Section 3, p. 9). The addition and removal obligations give explicit witness vertex sets for each distance case (Sections 3, pp. 9–10).

Verus form. Inference: this is a specification-discovery workflow for Verus. Generate candidate Rust data structures and test cases, but require a Verus `proof fn` to establish each of the four predicates for symbolic `t`. Store finite SAT assignments as regression fixtures, not as the general proof. The cyclic-gap and interval arguments would become arithmetic lemmas over `int` and sequence membership; any generated code remains untrusted until Verus checks its postconditions.

Evidence and limits. The theorem is proved for all `t≥4`; the conjectural `R(3,t)` family was only checked through `t≤63` and remained unproved (Section 4.1, p. 12). The paper's SAT data therefore supports conjectures but does not establish their universal claims. Inference: VL should distinguish finite counterexample search from quantified verification in its product reports.

## technique 3: LLM autoformalization with Lean

What it is. An LLM first writes a detailed informal proof, then an autoformalization system generates Lean code. The paper reports, “We prompted Gemini 3 Deep Think to ‘write a proof that is very detailed and formal so that it can readily be formalized in Lean.’” (Section 3, p. 9). The resulting proof was fed to Harmonic's Aristotle, which “generated a complete formal proof in Lean after two attempts” (Section 3, p. 9). The formalization is over 1,000 lines (Section 1.2, p. 5).

How to do it.
1. Make the informal proof sufficiently explicit about definitions, interval bounds, and each case (Section 3, p. 9).
2. Prompt a model for a formalizable proof, rather than code alone (Section 3, p. 9).
3. Feed that proof to the autoformalizer and compile the generated Lean code (Section 3, p. 9).
4. Use compiler/formalizer errors to refine the proof, repeating until Lean accepts it; the paper says this took two attempts for Theorem 1 (Section 3, p. 9).
5. Human-edit the informal exposition for clarity while retaining the formal proof as the correctness authority (Section 3, p. 9).

Verus form. Inference: ask an agent for a detailed proof plan, then have it emit Rust/Verus declarations and `proof fn`s. Compile with Verus after each repair. Keep generated proof code separate from executable code, and require every theorem to have explicit `requires`/`ensures`. Lean's libraries and tactics do not transfer; the loop of model proposal, verifier diagnostics, and repair does.

Evidence and limits. Lean acceptance establishes the encoded theorem under Lean's trusted kernel and imported libraries. It does not validate the natural-language conjecture if definitions were mistranslated, and the paper does not give an independent proof-assistant audit or solver-certificate accounting. The authors themselves motivate formalization because “LLM-generated proofs are notorious for containing subtle errors” (Section 3, p. 9). Inference: this is a high-value pattern for agent-written verified Rust, but the trusted specification and formalization boundary remain product risks.

## technique 4: formal lower bound by imported saturation theorem

The paper asks an LLM to prove `DS(s,t) ≥ 2s+2t−7`. The proof imports Hajnal's theorem: a `k`-saturated graph either has a universal vertex or minimum degree at least `2(k−1)` (Section 5, p. 13). It then rules out universal vertices using double saturation: removing any incident edge would have to create an independent `t`-set, impossible when `t≥3`, and applies the theorem to the graph and its complement. The degree inequalities yield `δ(G)≥2(s−2)` and `δ(G)≥2(t−2)`, then `n≥2s+2t−7` (Section 5, pp. 13–14).

Verus form. Inference: encode the imported theorem as a trusted library lemma only after checking its exact assumptions. Prove the universal-vertex contradiction and degree algebra as separate `proof fn`s, then compose them. This modular structure makes assumptions visible and avoids asking an SMT solver to discover the whole combinatorial argument.

## what is proved, measured, and trusted

Proved: the `6t−11` construction for every `t≥4`, its four graph properties, and the lower bound `DS(s,t)≥2s+2t−7` as formalized in Lean. Measured or searched: finite SAT existence/nonexistence instances, counts of isomorphism classes, 18 satisfying assignments for one `R(3,7)` instance, over 100 `R(3,10)` graphs on 39 vertices, and Paley-graph checks through `s=20` (Section 4, pp. 11–12). Conjectural: the broad existence conjecture and the `R(3,t)` family. Trusted: graph definitions, the Lean kernel and libraries, generated formalization, SAT encodings and solver behavior, and the LLM's candidate discovery. Inference: the threat to VL is moderate. LLMs can discover useful invariants and proof decompositions, but only a sound Verus check can turn them into product guarantees; finite search and an accepted proof must never be conflated.

The workflow already covers SAT encoding, symmetry breaking, model-assisted conjecture discovery, explicit case proofs, and autoformalization. Inference: VL should reuse these components and focus new work on Rust/Verus certificate checking, specification extraction, and trusted-base reporting rather than repeating generic LLM theorem-proving demonstrations.

## techniques for the catalog

- compact double-saturation SAT encoding — encode forbidden subgraphs, local edge witnesses, cardinality counters, and symmetry breaking in `O(n^4)` clauses for fixed parameters
- computation-to-conjecture pipeline — use finite SAT/code searches, canonicalize isomorphic structures, and extract a symbolic family before proving it
- LLM proof proposal with Lean checking — require a detailed informal proof, autoformalize it, and iterate on verifier diagnostics until the kernel accepts the theorem
- modular saturation lower bound — import a degree theorem, rule out universal vertices, and compose complement and graph degree inequalities
Checked 2026-10-15 against paper przybocki2026doubly: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
