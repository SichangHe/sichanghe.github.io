# Finite Model Finding for Parameterized Verification
(authored by agents unless marked 🧑)
Tag: `lisitsa2010finite`, [paper](http://arxiv.org/abs/1011.0447v2)

## scope and core idea

The paper studies finite countermodel finding (FCM) for safety of parameterized and infinite-state systems. Its starting point is a state encoding in first-order logic: reachability is represented as logical consequence. The abstract states, “The verification of a safety property is reduced to the purely logical problem of finding a counter-model for a first-order formula” (abstract, p. 1). A complete finite model finder can then search for a finite structure satisfying the system axioms and the negation of the bad-state claim. The paper establishes relative completeness of FCM for a class of parameterized linear arrays of finite automata, shown to be “at least as powerful as known methods based on monotonic abstraction and symbolic backward reachability”, and then shows that FCM “can solve all safety verification problems which can be solved by regular model checking” (abstract, p. 1; Sections 4–5, pp. 5–13). The completeness condition it names is the existence of a regular set separating reachable and bad states (Sections 5, 7, pp. 10, 16). PDF page numbers are used throughout; the arXiv PDF carries no printed page numbers.

## technique 1: reachability as first-order deducibility

What it is. Choose an encoding `e(s)=φ_s` of each transition-system state such that reachability implies logical entailment, and ideally is equivalent to entailment. The paper states, “Under such assumptions establishing reachability amounts to theorem proving, while deciding non-reachability, becomes theorem disproving” (Section 1, p. 1). For safety, encode initial and transition facts as a first-order theory `ΦP`; encode bad states as an existential formula `ΨF`; prove safety by finding a model of `ΦP ∧ ¬ΨF`.

When to use it. Use FCM when configurations can be represented by first-order terms and a finite model builder can find a finite structure separating reachable from bad states. It is especially suited to parameterized systems where the number of processes is unbounded but local states and transition rules are finite.

How to do it for linear arrays.

1. Define a finite local-state set `Q` and guarded or unguarded transition rules. A configuration is a word `c1…cn ∈ Q*`; guards quantify over states to the left, right, or both sides (Section 2, pp. 2–3).
2. Represent a word by a term `c1 * … * cn`, with associativity and unit axioms for `*` and `e` (Section 3.2, p. 4).
3. Add unary predicates for initial configurations, guarded contexts, and reachability `R`. Add axioms generating all-green initial states and one reachability implication per transition rule (Section 3.2, pp. 4–5).
4. Define the bad-state formula. In the mutual-exclusion example, bad configurations are `Q* red Q* red Q*`, meaning at least two red processes (Section 3.1, p. 3).
5. Ask a finite model finder for a model of `ΦP ∧ ¬ΨF`. If it finds one, the first-order theory does not entail a bad state, which establishes safety under the encoding assumptions (Section 3.3, p. 5).

The mutual-exclusion case uses states green, black, blue, and red, starts from `green*`, and includes guarded transitions such as `∀LR {green, black}: green → black` and `∀L {green}: blue → red` (Section 3.1, p. 3). Proposition 1 proves adequacy by induction: every reachable configuration yields a derivable `R` term (Section 3.2, p. 5).

Verus form. Inference: encode a bounded or symbolic Rust state as a ghost datatype and define a pure `spec fn` for one transition; state reachability as an inductive predicate or sequence property; and state safety as an `ensures` clause or `assert` that no bad state occurs. Inference: Verus itself proves first-order verification conditions with SMT rather than searching arbitrary finite first-order models, so FCM would be an external invariant/countermodel generator whose candidate model or invariant is then checked in Verus. Inference: the term monoid encoding is specific to word configurations and does not directly represent heap graphs, aliasing, or arbitrary Rust structs.

Evidence and limits. For the mutual-exclusion instance, Mace4 found the required finite model in 0.03 seconds (Section 3.3, p. 5). The Section 5.4 table (p. 14) also lists 0.03 s for “Mutual exclusion I” (referenced as “[1] and 3”) as an average of 10 attempts; Inference: this is the same instance. This is one case; it is not a general performance rate. Soundness rests on the adequacy propositions (Propositions 1–2, Corollary 1). Inference: the model finder’s output must also be trusted or independently checked.

## technique 2: generic encoding of initial, bad, and transition languages

What it is. For a general parameterized array, choose an initial local state `q0`, a finite set `F` of bad-pattern words, and guard predicates for transition conditions. The paper translates these into universally closed first-order formulas using constants for `Q ∪ {e}`, a binary operation `*`, unary predicates `In` and `R`, and one predicate for each universal guard (Section 4.1, pp. 5–7).

How to do it. Add associativity and unit axioms; generate `In(e)` and `In(x) → In(x*q0)`; imply `In(x) → R(x)`; define each guard predicate inductively over allowed local states; encode unconditional and `∀L`, `∀R`, `∀LR`, `∃L`, `∃R`, and `∃LR` transitions with reachability implications; and encode each bad word `w` as an existential pattern with variables between its symbols (Section 4.1, pp. 5–7). Proposition 2 establishes that every reachable configuration entails its `R` formula. Corollary 1 states that if `ΦP` does not entail the bad-pattern formula, safety follows (Section 4.1, p. 7).

Verus form. Inference: each guard can become a `requires` clause or a predicate lemma over ghost sequence state; each transition rule can become a proof lemma showing preservation of an inductive invariant. Inference: existential context guards require quantified sequence reasoning or explicit lemmas, which may be harder for Verus’s SMT backend than the finite-model search used in the paper.

## technique 3: relative completeness via regular separators

What it is. The paper compares FCM with monotonic abstraction and symbolic backward reachability. Monotonic abstraction over-approximates transitions under the subword relation. Starting from bad configurations, compute `U0 = B` and `Ui+1 = Ui ∪ Pre(Ui)` until stabilization; represent each `Ui` by finitely many generators; then test whether initial configurations intersect the fixed point (Section 4.2, pp. 7–8).

The relative-completeness proof assumes the algorithm terminates with `Init ∩ U = ∅`. `U` has a finite set of generators and hence is regular, and it serves as the regular separator: it contains the bad configurations and their abstract predecessors and excludes initial states. Because `U` is regular, there is a finite monoid `M`, subset `S`, and homomorphism `h` recognizing it. Interpret `*` as monoid composition and `R` as `M − S`; the resulting finite structure satisfies `ΦP ∧ ¬ΨF` (Theorem 1, Section 4.2, pp. 8–9). The key condition is existence of a regular set separating reachable and unsafe states. For the two refinements of monotonic abstraction in [2], the paper says the same argument applies but “We postpone the detailed presentation till another occassion” (Section 4.3, p. 9).

Evidence and comparison. Section 4.3 takes from [2] a five-state system (`q0`–`q4`, six rules) that “satisfies mutual exclusion for state q4, but this fact can not be established by the monotone abstraction method from [1]”; “Mace4 has found a finite countermodel of the size 6 in 341s” (Section 4.3, p. 9). The denominator is one protocol instance; the result demonstrates a capability difference, not a percentage.

Verus form. Inference: a regular separator corresponds to a finite-state ghost invariant whose inductiveness and disjointness from bad states are proven with Verus lemmas. Inference: the finite monoid is a proof-search artifact; a Verus implementation would normally prove the separator’s invariant directly rather than execute the model finder.

## technique 4: reduction from regular model checking

What it is. Regular model checking (RMC) represents initial and bad sets with finite automata and one-step transitions with a finite-state transducer. Safety asks whether `rτ* (Init) ∩ Bad = ∅` (Section 5, p. 10). The paper translates automata and transducer runs into first-order predicates `Init`, `Bad`, `Trans`, and `R`; clauses state automaton composition, transducer composition, and reachability closure (Section 5.1, pp. 11–12).

How to do it. Build a first-order vocabulary containing alphabet and automaton-state constants, `*`, automaton-run predicates, and transducer predicates. The transducer must be finite-state and length-preserving. Encode initial and bad automata acceptance, encode transducer paths by relational composition, define `Trans`, and add `Init(x) → R(x)` and `R(x) ∧ Trans(x,y) → R(y)` (Section 5.1, pp. 11–12). Ask the finite model finder for a countermodel to `Φ → ∃x(R(x) ∧ Bad(x))`. Theorem 2 proves relative completeness whenever a regular set `R` contains `rτ*(Init)` and is disjoint from `Bad` (Section 5.2, p. 12).

Verus form. Inference: finite automata and transducers can be represented as ghost enums and transition tables; Verus can prove that a Rust implementation preserves an automaton invariant. Inference: transitive closure is not a direct executable Verus primitive, so bounded or inductive formulations are needed.

## technique 5: practical FCM workflow and optimization

Implementation. The experiments use Mace4 in Prover9-Mace4 0.5 on Windows XP Professional, Intel Core 2 Duo T7100 at 1.8 GHz, and 1 GB RAM; each listed time is an average of 10 attempts (Section 5.4, pp. 13–14). Results are: token passing non-optimized 0.12 s, token passing optimized 0.01 s, mutual exclusion I 0.03 s, mutual exclusion II 341 s, Bakery 0.03 s, and Paterson− 0.77 s (table in Section 5.4, p. 14). These are average Mace4 CPU times per protocol over ten attempts; the table has six rows and no success rates. The table cites “[2] and 4.2” for Mutual exclusion II, while the text discusses that system in Section 4.3.

Optimization. When transitions, initial sets, or bad sets have simpler rule or grammar descriptions than automata, simplify the first-order translation; the linear-array encoding is given as an example (Section 5.3, p. 13). Beyond regular initial sets, the paper encodes a context-free generation rule for Paterson− and verifies the reduced system Paterson−, which keeps only rules 1, 2 and 4, with a size-8 countermodel in 0.77 seconds; “we failed to verify the correctness condition for the Paterson algorithm” itself (Section 5.5, p. 14).

Verus form. Inference: use specialized ghost representations and lemmas for common transition schemas instead of translating every state machine into a generic relation. Inference: report failed cases and unsupported non-regular sets explicitly; an inability to find a finite model is not a proof that safety fails.

## what is proved, measured, and trusted

The paper proves adequacy of its encodings and relative completeness under regular-separator assumptions. It measures finite-model search times and model sizes for named protocol instances. It does not prove termination for arbitrary first-order encodings, and finite countermodels may not exist even when a formula is false. Inference: trusted components include the state encoding, first-order logic semantics, and Mace4’s model search. Inference: a VL deployment would need a checker for the model or a Verus proof that the extracted invariant is inductive; trusting a raw model-finder output is weaker than replaying a proof.

## contradictions, omissions, and product implications

The paper’s numerical denominators are explicit: six protocol rows, ten attempts per time, 0.03 seconds for mutual exclusion I, and 341 seconds for mutual exclusion II. It does not provide an overall success percentage. The conclusion says, “We conclude with the very general claim that, for any parameterized system, for which there exists a regular set separating reachable and unsafe states, its correctness can be demonstrated by a finite countermodel finding method” (Section 7, p. 16). It also says “Further investigation of practical efficiency and scalability of the method is also an important direction for future work” (Section 7, p. 16). Inference: VL should not treat FCM as a complete verifier for arbitrary agent-written Rust; it is a countermodel/invariant-discovery method with a clear completeness condition.

Inference: the main reusable idea is to compile reachability into one logical satisfiability/model-finding query, then independently check the resulting finite certificate or separator. Inference: VL should not redo the paper’s monoid proofs or protocol encodings except as benchmarks. Inference: threat to an agent-written verified-Rust product is medium to high when state is naturally a sequence or finite automaton: wrong encodings can make a model appear safe, and missing finite separators can cause unknown results even for safe programs.

## techniques for the catalog

- reachability as deducibility — encode transitions and initial states as first-order axioms and safety as non-entailment of a bad-state formula
- finite countermodel finding — search for a finite model of the system axioms conjoined with the negated bad claim
- regular-separator completeness — derive a finite monoid model when a regular set separates reachable and unsafe configurations
- automata/transducer reduction — compile regular model checking into first-order predicates for one finite-model query
- specialized encodings — simplify generic formulas using transition rules, automata, grammars, and sequence-specific schemas
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "For some parameterized systems the method based on monotone abstraction may fail to establish safety even though it may actually hold."): read all 17 PDF pages of the text (no appendix is included in the text, though Section 4.3 mentions one); checked every quotation, number, theorem and proposition reference, encoding step, the Mace4 setup and the six-row timing table; changed the abstract/scope claim (“equal power” to what the abstract says), converted page references to PDF pages (several were off by one or two, e.g. the conclusion is p. 16), removed the unsupported “one machine invocation” claim, corrected the Section 4.3 and Paterson− descriptions, added the length-preserving transducer condition, and marked unsupported trust statements as Inference. Not checked: the cited external papers, the Mace4 inputs on the author's web page [18], and the correctness of the paper's proofs beyond reading them; the Verus-form paragraphs are inference, not from the paper.
