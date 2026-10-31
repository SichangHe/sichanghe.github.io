# Relational Program Synthesis
(authored by agents unless marked 🧑)
Tag: `wang2018relational`, [paper](http://arxiv.org/abs/1809.02283v2)

## problem
Relational synthesis generates one or more programs that jointly satisfy a specification over multiple runs or functions. Examples are equivalence, inversion, non-interference, transitivity, comparator laws, and equals/hash-code consistency. The paper's definition is a first-order sentence `Psi = forall x . phi(x)`, where `phi` is quantifier-free and contains uninterpreted functions (section 2.1, p. 3). A solution chooses one program from each domain-specific language (DSL) and makes the tuple satisfy Psi.

The implementation, Relish, combines counterexample-guided inductive synthesis (CEGIS) with relational version-space learning represented by hierarchical finite tree automata (HFTA). The paper reports that “Our experimental results show that the proposed technique can solve almost all of these benchmarks” (abstract, p. 1), but the exact denominators and settings are given below. Relish was instantiated for only two domains, encoders/decoders and comparators (section 6, p. 16).

## technique: write relational specifications
Use this when correctness depends on interactions among functions or executions, rather than one function in isolation.

Steps from the paper:
1. Choose the functions and DSLs. For an encoder/decoder pair, use separate encoder and decoder grammars; for a comparator, use a string-processing grammar (sections 2.2 and 6, pp. 3–4, 17–18).
2. Add concrete input-output examples to anchor intended behavior. The Base64 example uses `encode("Man") = "TWFu"`, `encode("Ma") = "TWE="`, and `encode("M") = "TQ=="` (Example 2.3, section 2.2, pp. 3–4).
3. Add quantified relational properties. The encoder/decoder property is `forall x . decode(encode(x)) = x`; comparator properties include reflexivity, anti-symmetry, transitivity, and totality (section 2.2, pp. 3–4).
4. Ensure the specification fits the supported form: universally quantified variables with a quantifier-free body. Quantifier alternation such as `forall x . exists y ...` is outside the implementation (section 9, p. 24).

Verus form (Inference): express each implementation as Rust functions with `requires`/`ensures`; state cross-function properties in `spec fn` predicates and prove them with `proof fn` lemmas. For k-safety properties, model multiple calls in ghost/specification code and connect them to executable functions. Verus does not synthesize the functions from a relational formula, so Relish's DSL search remains an external proposal mechanism.

## technique: relational CEGIS loop
The top-level algorithm (Algorithm 1, p. 9) is:
1. Start with random candidate programs `P` and ground constraint `Phi = true`.
2. Verify P against the full relational specification Psi. Return P if verification succeeds.
3. Otherwise obtain a ground relational counterexample and conjoin it to Phi.
4. Relax Phi by replacing each occurrence of a function with a fresh symbol, obtaining Phi-prime and an occurrence map M.
5. Build an HFTA for Phi-prime and its DSL grammars.
6. Find functionally consistent programs accepted by that HFTA, then repeat verification.

The paper explains the loop as alternating induction and verification: “the verifier checks whether these programs satisfy the relational specification Ψ” and, on failure, “we obtain a relational counterexample in the form of a ground formula” (section 5, p. 9). The paper gives `f(1) = g(1)` and `f(g(1), g(2)) = f(3)` as example relational counterexamples (section 1, p. 2), so counterexamples can refer to compositions of the functions being synthesized.

Verus form (Inference): use a verified Rust checker as the verifier oracle. It should return a concrete failing input tuple, represented as ghost data or a diagnostic value, when a candidate violates a proved relational contract. The Verus proof must establish soundness of the checker; synthesis itself can remain untrusted because every final candidate is reverified.

## technique: relaxation and HFTA relational version spaces
Why relaxation: repeated occurrences of one function create circular dependencies when constructing ordinary FTAs. The paper replaces each occurrence with a fresh function symbol, then records in a mapping M which fresh symbols come from the same original function; functional consistency is enforced afterwards (sections 5 and 5.1, pp. 9–10).

Steps:
1. Recursively replace every function occurrence in a ground formula with a fresh symbol; constants and logical operators are copied (Figure 6, p. 10).
2. Build one FTA node per relaxed subterm or subformula. Child-to-parent (inter-FTA) transitions carry possible values through the syntax tree (section 5.2, pp. 10–11).
3. Compose these FTAs into an HFTA whose language consists of exactly the programs that satisfy the relaxed specification (section 5, p. 9; Theorems 5.2 and 5.3, p. 13, soundness and completeness with respect to the relaxed specification).
4. Enforce functional consistency by propagating one chosen program to every fresh symbol mapped to the same original function, using the backtracking `FindProgs` procedure (Algorithms 2 and 3, pp. 14–15).
5. Enumerate accepted trees lazily by DSL cost. Relish flattens the HFTA to a hypergraph and finds minimum-weight B-paths, preferring lower-cost programs (section 6.1, pp. 16–17).

The paper proves soundness, conditional on the verifier being sound: “Assuming the soundness of the Verify procedure invoked by Algorithm 1, then the set of programs P returned by Synthesize are guaranteed to satisfy the relational specification Ψ, and program Pi of function fi conforms to grammar G(fi )” (Theorem 5.5, p. 16). It proves completeness under a representability assumption: if a satisfying tuple exists that the DSLs can express, Algorithm 1 eventually terminates with programs satisfying Ψ (Theorem 5.6, p. 16).

Verus form (Inference): HFTA states can be represented as ghost sets of candidate syntax trees, while executable Rust contains only the selected implementation. Use `spec fn` predicates for grammar membership and consistency, `proof fn` lemmas for HFTA closure, and `assert` to connect each selected tree to the contract. This is an inference because the paper uses finite tree automata, not Verus.

## technique: bounded verification inside CEGIS
Full verification each iteration may be expensive. Relish instead generates all permutations of a finite input set up to bounded length k and checks candidates against more than one million validation cases per iteration; it invokes full verification only after a candidate passes this bounded set (section 6.1, p. 17).

Inference: this is a fast bug-finding filter, not a proof. In a Verus integration, bounded testing can prioritize candidates, but the final `verus` proof and its quantifiers must establish the unbounded contract. The trusted boundary includes the validation generator, full verifier, DSL semantics, and any external library specifications.

## evidence and limits
For ten encoder/decoder benchmarks, Relish solved all 10 within the 24-hour limit and averaged 17.9 seconds per benchmark; EUSolver solved 5/10 within the limit and averaged about 12 minutes on those solved cases. On the five common solved benchmarks, Relish's geometric-mean speedup was 46.5x (Table 1, p. 20; footnote 10, p. 21). The authors manually inspected the synthesized encoders and decoders and confirmed their correctness (footnote 9, p. 20). Seven of the ten benchmarks come from Hu and D'Antoni 2017 (section 7.1, p. 20). Relish used 2.8 CEGIS iterations versus EUSolver's 3.4 on those five; its average memory was 685 MB, range 284–1843 MB (section 7.1, p. 21). EUSolver was extended by the authors with the same DSLs and the same CEGIS loop and bounded verifier as Relish; the machine had an Intel Xeon E5-1620 v3 and 32 GB of memory (section 7, pp. 19–20). The denominators differ: “all” means ten encoder/decoder benchmarks, while speedup uses only five common solved benchmarks.

For 20 comparator benchmarks, Relish solved 19/20 (95%) within 24 hours, averaging 94.7 seconds over those 19; EUSolver solved 13/20 and Relish solved 46% more (19 versus 13). On the common solved cases the paper reports Relish as 26x faster (Table 2, p. 22; the paper names the geometric mean only for Table 1, footnote 10). The text gives average CEGIS iterations of 7.0 versus 9.9 and per-iteration times of 12 versus 492 seconds (section 7.2, p. 22); the 7.0 is consistent with Table 2 rows for the 13 benchmarks both tools solved, while Table 2's Average row shows 7.7 for Relish over its 19 solved benchmarks. Comparator memory ranged 12–18,367 MB and averaged 3,382 MB over solved runs. Comparator-20 timed out because its required integer concatenation is not expressible in the DSL (section 7.2, p. 23).

The paper says its method “only works with simple DSLs without recursion, loops, or let bindings” and only allows specifications of the form ∀x.ϕ(x) with quantifier-free ϕ (section 9, p. 24).

## techniques for the catalog
- relational specification — state cross-function or cross-run laws with quantified, quantifier-free formulas plus examples
- counterexample-guided relational synthesis — alternate candidate verification and ground relational counterexamples
- occurrence relaxation — replace repeated function occurrences with fresh symbols to avoid circular version-space construction
- HFTA version spaces — compose FTAs for subterms and propagate functional consistency across occurrences
- cost-guided lazy enumeration — flatten HFTAs to weighted hypergraphs and enumerate low-cost accepted programs first
- bounded validation filter — test over a large finite input set before invoking full verification
