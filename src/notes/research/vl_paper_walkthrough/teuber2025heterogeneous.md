# Heterogeneous Dynamic Logic: Provability Modulo Program Theories
(authored by agents unless marked 🧑)
Tag: `teuber2026heterogeneous`, [paper](https://doi.org/10.1145/3808295)

## purpose
Heterogeneous Dynamic Logic (HDL) combines existing program logics so a system containing components from different languages can be specified and proved compositionally. The motivation is a Java controller coupled to a differential-equation environment. The authors state: “HDL mirrors the architecture of satisfiability modulo theories (SMT): Individual dynamic logics, along with their calculi, are treated as dynamic theories that can be combined to reason about heterogeneous systems whose components are verified using different program logics.” (abstract, PDF page 1). The supplied version identifies itself as a 2026 PLDI article (PDF page 1). It presents a framework, mechanized soundness proofs, relative-completeness proofs, and a case study.

## technique 1: define a dynamic theory interface
Use this when a program logic must interoperate with another logic while retaining its own semantics and proof rules. A dynamic signature contains disjoint sets of variables, atoms, and programs (Definition 4.1, PDF page 6). A domain of computation supplies a universe, state space, variable evaluation, atom evaluation plus finite free-variable overapproximation, and program transition relation plus finite free-variable overapproximation (Definition 4.6, PDF page 8). Formulas use atoms, Boolean/quantifier structure, and modalities `[p] F`; the box means every transition of program `p` reaches a state satisfying `F` (Definitions 4.2 and 4.8, PDF pages 6 and 8).

Steps:
1. define the variables, atoms, and atomic programs of one language (Definition 4.1, PDF page 6)
2. define states and a variable evaluator satisfying state independence: values on any variable subset can be taken from one state and the remaining values from another (Definition 4.3, PDF pages 6–7)
3. define atom semantics and a finite overapproximation of variables that affect each atom (Definition 4.4, PDF page 7)
4. define program transition semantics and finite free-variable overapproximations; coverage must hold for every superset of the approximation, and transitions must respect equality of variable values (Definition 4.5, PDF pages 7–8)
5. instantiate the formula semantics and supply a sound base calculus, complete for propositional and uninterpreted first-order reasoning (Definitions 4.7–4.10 and section 4.5, PDF pages 8 and 10)

The proof-calculus requirement is soundness: derivability of a formula implies its validity (Definition 4.10, PDF page 10). The paper proves coincidence lemmas for formulas and programs and bounded effects from these interface conditions (Lemmas 5.1–5.3, PDF page 11); the program coincidence lemma assumes the two initial states differ on only finitely many variables.

Inference: a Verus-oriented dynamic theory could expose Rust/Verus operations as atomic programs, use ghost state as the semantic state, and map Verus `requires`/`ensures` contracts to formulas. The paper’s modalities and transition relations are not Verus syntax; this is a design analogy.

## technique 2: language-independent elementary rules
Once a dynamic theory supplies its atomic calculus, HDL adds rules that do not depend on a language’s internals. Figure 2 gives generalization (G), vacuity (V), variable quantifier movement (B), equivalence replacement (E), and modal implication (K) (section 5, PDF page 11). Theorem 5.1 proves these rules sound for any dynamic theory. Side conditions use free and bound variable sets and can be discharged by syntactic analyses (section 5, PDF page 12).

Use the rules to compose proofs around opaque atomic programs. For example, (V) proves that an initially true postcondition remains true when the program changes none of its free variables; (K) distributes a modality over implication; and (E) replaces a program with an equivalent one proved by dynamic logic or Kleene Algebra with Tests (KAT) rewriting (section 5, PDF pages 11–12). Refinement `p ≲ q` is defined by transition inclusion, and equivalence is mutual refinement (Definition 4.11, PDF page 11).

Inference: Verus can play the atomic-calculus role for individual Rust functions, while ghost lemmas establish equivalence or refinement between wrappers. Verus does not provide HDL’s `[p]` modality, so the correspondence must be encoded with function contracts and proof lemmas.

## technique 3: havoc lifting and proof reuse
Havoc lifting adds a program `v := *` that assigns any value admissible for that variable. The lifted transition relation preserves all other variables and gives the new construct an empty free-variable set (Definition 6.1, PDF page 12). Theorem 6.1 proves the result is again a dynamic theory. The havoc axiom is `[v := *] ϕ ↔ ∀v ϕ` (Lemma 6.2, PDF page 13), and Havoc Reduction transfers proofs of original-language formulas into the lifted theory (Lemma 6.1, PDF page 13). The restriction matters: “Rule (HR) enables this reuse even when Δ’s axiom schemata may not hold for arbitrary Δ:=∗-instantiations, by restricting reductions to formulas from FmlΛ.” (section 6.1, PDF page 13).

Steps:
1. add havoc syntax for every variable (Definition 6.1)
2. define its arbitrary-value transition relation and empty free-variable set (Definition 6.1)
3. prove the lifted interface conditions (Theorem 6.1)
4. reuse old proofs with HR and reason about havoc with the havoc axiom (Lemmas 6.1–6.2)

Inference: a Verus encoding could model havoc as a relation that leaves one ghost value unconstrained and preserves the others. Its admissible values and any coupling assumptions would need an explicit specification.

## technique 4: regular-program lifting
Regular closure adds sequential composition, nondeterministic choice, first-order tests, and nondeterministic loops. Definition 6.2 gives the grammar `r | p;q | p ∪ q | ?(F_FOL) | (p)*` and transition semantics (PDF pages 13–14). Theorem 6.2 proves this closure is a dynamic theory. Figure 3 supplies sound decomposition axioms for tests, sequence, choice, and loops; axiom (I) gives invariant reasoning, while axiom `(∗)` unfolds one loop step (section 6.2, PDF page 14).

Use the convergence rule when proving eventual reachability. Inductive expressivity requires variables capable of representing every natural number under a numeric interpretation, and first-order predicates for positivity, equality, and successor (Definition 6.4, PDF page 15). Lemma 6.4 uses these to prove a convergence axiom with distinct counting and helper variables absent from the program's free and bound variables; the helper must also be absent from the variant formula's free variables. The integer semiring theory is shown inductively expressive (Lemma 6.5, PDF page 15), and Example 6.2 presents a guarded integer loop and a Gauss-sum upper-bound formula (PDF pages 15–16).

Inference: Verus loop invariants and decreasing integer measures are the closest constructs. In Verus, write a loop `invariant` clause and a `decreases` clause using the actual syntax supported by Verus; the HDL regular-program rules are mathematical inspiration, not code to paste.

## technique 5: combine theories with communication atoms
Given theories Δ⁽⁰⁾ and Δ⁽¹⁾, HDL forms a product state space and disjointly unions variables, atoms, and programs. New heterogeneous atoms constrain values across components (Definitions 7.1–7.4, PDF pages 16–17). The paper explains: “Heterogeneous atoms can be considered the dynamic theory counterpart to mixed terms in first-order theory combination.” (section 7.1, PDF page 17). Havoc followed by a first-order check using these atoms models communication.

Steps:
1. form product states and a variable evaluator selecting the component owning each variable (Definition 7.1)
2. retain each component’s atoms and add cross-component atoms (Definition 7.2)
3. retain each component’s atomic programs in one signature (Definitions 7.3–7.4)
4. prove the simple combination is a dynamic theory and then apply havoc and regular lifting (Theorem 7.1 and Definition 7.5)
5. use HR0/HR1 only for pure component formulas; decompose mixed obligations with the combined calculus, communication atoms, and first-order reasoning (Lemma 7.1, PDF page 18; case-study proof, PDF pages 21–22 and 45–47)

The car case study couples JavaDL and differential dynamic logic with `equal` and `round` atoms, then proves that repeated controller/environment execution never overshoots a stop sign, assuming `coupledPre` (Lemma 9.3, PDF pages 21–22). The proof decomposes the combined obligation until the JavaDL controller lemma and differential-logic environment lemma apply. Section 9 defines the sensed distance using `s − x` (PDF page 21), whereas appendix C.3 prints `x − s` (PDF pages 45–47). These expressions have opposite signs; the supplied paper does not resolve this discrepancy.

Inference: for VL, communication atoms resemble explicit coupling lemmas between a verified Rust component and an external model (device, allocator, or protocol). The coupling must be stated and proved; merely sharing a variable name is not evidence.

## completeness, evidence, and limits
The paper proves relative completeness transfer: if both component theories are relatively complete, first-order expressive, Gödel expressive, have finite support, and are communicating, then the fully heterogeneous theory is relatively complete (Theorem 8.1, PDF page 20; proof in appendix B.2, PDF page 33). First-order expressivity supplies exact first-order descriptions of program transitions; Gödel expressivity supplies finite-sequence encodings; finite support bounds writes; communication synchronizes integer indices across theories (section 8.1, PDF pages 19–20; appendix B.1, PDF pages 30–32). Relative completeness assumes an oracle for valid first-order formulas; it does not establish decidability or automation (Definition 8.1, PDF page 19).

Isabelle formalizes the definitions, liftings, combination, and soundness via reusable locales (abstract and appendix D, PDF pages 1 and 48–52). The paper presents the relative-completeness arguments separately in appendices B–C. The Java controller lemma is mechanized in KeY, the environment lemma in KeYmaera X, and the heterogeneous composition proof is presented in the paper (section 9 and appendix C.3, PDF pages 20–22 and 45–47). The work reports no runtime, corpus, or success-rate denominator.

Inference: applying these results requires trusting the component calculi, their semantic models and coupling definitions, the formalization and proof checkers, and the proofs of component lemmas. The authors note a limitation: Barcan’s axiom implies a fixed variable domain, although existence predicates can typically work around it (section 9, PDF page 22). They also state: “In future work, we plan to extend our Isabelle formalization into a practical tool for HDL proofs.” (section 9, PDF page 22).

Inference: threat to agent-written verified Rust is medium for composition. HDL shows how to preserve proof obligations across heterogeneous components, but it does not verify Rust, prove external-library contracts, or remove the trusted specification and semantic bridge. VL should reuse explicit coupling contracts, proof decomposition, and proof-reuse rules rather than reimplement a generic multi-language logic without a concrete interoperability case.

## techniques for the catalog
- dynamic-theory interface: model a language with states, atoms, transitions, free-variable bounds, and a sound base calculus
- elementary modal rules: reuse language-independent sound rules for vacuity, implication, quantifier movement, and program equivalence
- havoc lifting: add unconstrained assignment while preserving old proofs through reduction
- regular closure lifting: derive sound rules for sequence, choice, tests, loops, invariants, and convergence
- heterogeneous state product: combine program theories with cross-component communication atoms
- relative-completeness transfer: preserve completeness under lifting and combination under explicit semantic assumptions
- mechanized modular proof: encode the framework and soundness theorems in Isabelle locales for reusable formal infrastructure
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The key advantage of theory lifting and combination was the ability to reuse proof calculi and obtain standardized additional proof rules which are valid irrespective of the lifted/combined theory."): read all 52 pages, including references and appendices; checked quotations, year, DOI, definitions, rule restrictions, technique steps, page references, completeness assumptions, and evidence scope; corrected the year, quotations, page references, vacuity and reduction descriptions, and recorded the case-study distance-sign discrepancy; did not rerun Isabelle, KeY, or KeYmaera X, independently prove the theorems, or validate the Verus design inferences.
