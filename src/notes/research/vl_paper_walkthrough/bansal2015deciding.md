# On Deciding Local Theory Extensions via E-matching
(authored by agents unless marked 🧑)
Tag: `bansal2015deciding`, [paper](http://arxiv.org/abs/1508.06827v1)

## scope and result
The paper gives a complete SMT decision procedure for local theory extensions. These extensions add quantified axioms to a base theory but remain decidable by finitely many axiom instances. The abstract states, “We present an algorithm that uses E-matching to generate instances incrementally during the search, significantly reducing the number of generated instances compared to eager instantiation strategies.” (Abstract, p. 1). The target applications are verification conditions for heap-manipulating programs, including lists, trees, sets, multisets, and frame axioms.

A theory extension is local when satisfiability of ground literals can be decided using only axiom instances whose substituted terms already occur in the ground problem or the axioms (Definition 2, p. 5). The paper states, “For a local theory extension, we can syntactically restrict the instances Kσ that need to be considered before concluding that G is satisfiable to a finite set of candidates.” (Section 2, p. 3). For a monotonicity axiom `forall x,y. x <= y -> f(x) <= f(y)`, the paper instantiates only combinations of existing terms such as `a` and `b`; it does not invent `0` or `1` merely because they occur inside arithmetic constraints (Section 2, pp. 2–3).

## technique: incremental E-matching decision procedure
Use this when quantified Verus or SMT specifications have a local theory structure and eager instantiation causes a combinatorial blowup.

1. Identify the base theory `T0`, extension axioms `Ke`, and ground formula `phi`. The base solver handles arithmetic, equality, arrays, or uninterpreted functions; `Ke` describes the application-specific theory (Sections 1–2, pp. 1–3).
2. Flatten and linearize extension axioms and annotate their variable-containing function applications as patterns. For a monotonicity axiom, `f(x)` and `f(y)` are patterns (Conclusion, p. 10; Algorithm DT1, p. 6).
3. During the SMT search, maintain the current satisfiable ground literals `G`, known equalities `E`, and already emitted instances `Z`.
4. For every extension axiom, run E-matching on patterns against terms in `G`, modulo equalities in `E`. A substitution is retained only when all instantiated subterms are already in `G` or `Ke` (Algorithm DT1, steps 1(a)–1(b), p. 6).
5. Skip substitutions equivalent modulo `E` to an instance already in `Z`; return only genuinely new instances `Z'` (Algorithm DT1, step 1(c), p. 6).
6. If `Z'` is empty, return `sat`; otherwise send the new instances to the SMT solver as theory lemmas and continue search (Algorithm DT1, step 2 and interaction description, p. 6).
7. Stop with `unsat` when the base solver finds a contradiction. Termination follows because no instance introduces a new ground term and the finite set `Ke[phi]` bounds all possible instances (Correctness, p. 7).

The paper states, “The correctness argument relies on two aspects: one, that if the SMT solver says sat (resp. unsat) then φ is satisfiable (resp. unsatisfiable) modulo T1 , and second, that it terminates.” (Section 5, p. 7). It proves that an SMT solver equipped with DT1 is a decision procedure for `T1` (Theorem 4, p. 7).

Inference: Verus users do not normally implement a quantifier module, but the pattern is directly relevant to quantified `spec fn` lemmas and triggers. A Verus proof can expose only the terms needed by a lemma, while avoiding broad quantifier instantiation. Exact E-matching control remains an SMT-backend concern, so this mapping is an inference.

## technique: hierarchical and Psi-local extensions
Use hierarchical extensions to modularize separate theories such as arrays, reachability, frame axioms, and program-specific data-structure facts (Section 4, p. 5). Compose procedures for each layer, or flatten all axioms into one local extension. When locality requires extra terms, use Psi-local extensions: provide the additional completeness terms as dummy ground assertions so the solver can instantiate them (Section 5, p. 7; experimental setup, p. 8).

Inference: In Verus, a layered proof library can separate sequence algebra, ownership/frame facts, and data-structure invariants. Dummy assertions would correspond to explicit ghost terms or helper lemmas that place required terms in the solver context. The paper does not define Verus APIs for this.

## technique: staged instantiation optimizations
Use these when the complete local procedure is correct but still generates too many instances.

1. Stage Psi-term instantiation after saturating terms from the original query; the authors report this helps because Psi terms are often unnecessary for proving unsatisfiability (Section 6, p. 10).
2. Add assertions of the form `(a=b) or (a!=b)` to force an equality arrangement before expensive instantiation (Section 6, p. 10).
3. Instantiate special equal-variable cases before the full combinations for axioms whose count grows as the fourth power of ground terms (Section 6, p. 10).
4. For EPR fragments, use E-matching for partial instantiation, then hand the resulting EPR problem to Z3’s complete model-based quantifier instantiation (Section 6, p. 10).

Inference: These are solver engineering strategies rather than source-level Verus constructs. They suggest that VL should measure trigger scope and staged lemma exposure instead of globally enabling every fact.

## evidence, assumptions, and limits
The benchmark corpus contains 108 procedures, 2,000 lines of code, 260 lines of contracts and loop invariants, and 250 lines of data-structure specifications, reduced to 816 SMT queries. Of these, 802 are unsatisfiable and 14 are satisfiable bugs (Section 6, p. 8). Experiments ran on StarExec with one hour and 100 GB per query using CVC4 and Z3 (Section 6, p. 8).

Table 1 reports 816 uninstantiated benchmarks. CVC4’s optimized complete configuration solved 812 in 10,732 seconds; Z3’s corresponding configuration solved 804 in 37,430 seconds (Table 1, p. 9). Table 2 reports partially instantiated benchmarks: CVC4 optimized solved 815/816 in 10,213 seconds, while Z3 optimized solved 814/816 in 11,447 seconds (Table 2, p. 10). The denominators are the table’s benchmark counts, and configurations differ in completeness. Four benchmarks had eager instantiation between 10^10 and 10^14 instances while E-matching generated zero for all four (Section 6, p. 8).

The procedure assumes the extension is local (or Psi-local with supplied extra terms), a terminating base-theory decision procedure, and correct equality-aware E-matching. It does not prove that an arbitrary quantified specification is local. Inference: For agent-written verified Rust, the threat is indirect but material: poorly scoped quantifiers and triggers can dominate proof time, while local-theory structure offers a principled completeness/performance target. Existing SMT quantifier work means VL should not claim generic E-matching as a new verification technique.

## techniques for the catalog
- local-theory restriction — decide quantified extensions using only instances over existing ground subterms
- incremental E-matching — emit new equality-aware axiom instances during SMT search and stop when saturated
- hierarchical extensions — compose local theory layers for arrays, reachability, framing, and program facts
- staged instantiation — delay auxiliary terms and prioritize cheap equality cases to reduce blowup
- EPR hybrid solving — reduce a local theory to EPR with E-matching, then use complete model-based instantiation
Checked 2026-10-14: audit record bansal2015deciding; paper-study comparison complete; gate executed; experiments not rerun
