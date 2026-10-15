# Construction–Verification: A Benchmark for Applied Mathematics in Lean 4
(authored by agents unless marked 🧑)
Tag: `yang2026constructionverification`, [paper](http://arxiv.org/abs/2602.01291v1)

## what the paper measures

The paper introduces AMBER, a 200-problem Lean 4 benchmark for applied mathematics. It forces an agent to construct a computable object and then prove its property. The benchmark has 100 easy and 100 hard problems across optimization, convex analysis, numerical algebra, and high-dimensional probability; the problem categories are proof (118), evaluation (42), algorithm (21), and representation transformation (19) (Table 4, p. 17). A generated answer counts only when Lean compiles both construction and verification. This is a benchmark and prompting study, not a Verus implementation; every Verus mapping below is an inference.

## technique 1: two-stage construction-verification template

what it is: separate a computable definition from a theorem proving that definition correct. For an evaluation problem with property Q(x,V), the agent must fill `def x (V)` using only raw parameters V, then prove `Q (x V) V`. The signature prevents the definition from receiving Q or its proof and therefore blocks a non-constructive existence shortcut (Section 3.1, pp. 3–4). The paper's example asks for x*=A⁻¹b for a quadratic optimization problem instead of merely proving that some minimizer exists.

when to use it: use this whenever a result must be executable or a concrete value matters. A proof of existence through compactness and continuity can be mathematically valid yet give no algorithm or value. The paper states: “Crucially, this architecture enforces a strict syntactic barrier against non-constructive shortcuts.” (Section 3.1, p. 4). It also describes the goal as “the construction-verification workflow, preventing agents from exploiting non-constructive shortcuts.” (Introduction, p. 2).

how to apply it:
1. state parameters V and the target property Q(x,V) (Section 3.1, p. 3)
2. write a definition `x : V → X` whose body computes the candidate from V alone (Section 3.1, p. 4)
3. write a theorem `Q (x V) V` and prove it in Lean (Section 3.1, p. 4)
4. compile both; an existence theorem that leaves the definition as `sorry` is not a solution (Section 5.1, p. 7)

Verus form: Inference: use an executable Rust function for the construction, a `requires` clause for input assumptions, and `ensures` for Q. Put mathematical helper facts in `spec fn` and `proof fn` declarations. Keep the function's inputs restricted to the raw problem parameters so it cannot call a proof or an existential witness. Verus's `ensures` proves the returned value's property; it does not create an executable value by itself.

evidence and limits: the full AMBER benchmark uses 16 samples per problem and Pass@k. Table 6 reports Pass@16 of 6.00% for DeepSeek-V3.2-Thinking and Gemini-3.0 Pro (12 of 200 problems if the percentages are rounded), 4.50% for GPT-5.1 (9 of 200), and 4.00% for Goedel Prover-32B and Kimina Prover-72B (8 of 200) (Table 6, p. 22). The paper reports percentages, while the implied counts from 200 can be fractional after rounding; the table is the authoritative metric. It reports near-zero success on every hard subset in Table 1 (p. 6), showing that constructing the object remains the bottleneck.

## technique 2: recursive algorithm construction and proof

what it is: represent an algorithm as a sequence A:N→S with an initial state and a transition rule. The agent must define the loop body Φ and then prove a property P(A), such as monotonicity or convergence (Definition 3.2 and template, Section 3.2, pp. 4–5). The template's recursive branch exposes the next-state computation rather than letting a theorem assert an abstract sequence.

when to use it: use it for gradient descent, Newton iteration, ADMM, root finding, or any method whose result is a state evolution rather than a closed form. The paper's exact definition is: “A(n + 1) = Φ(A(n), V) (Inductive Step), where Φ is the transition function to be constructed.” (Section 3.2, p. 5).

how to apply it:
1. choose a state type S and parameter type V (Section 3.2, p. 5)
2. define A(0)=init(V) (Section 3.2, p. 5)
3. define the recursive transition A(n+1)=Φ(A(n),V), filling the code rather than a proof placeholder (Section 3.2, p. 5)
4. state P(A), including the desired invariant, decrease, or convergence fact (Section 3.2, p. 5)
5. prove P(A) after the recursive definition compiles (Section 3.2, p. 5)

Verus form: Inference: define an executable Rust loop or recursive function, state a loop `invariant` over the state and a `decreases` measure when termination needs proof, and use `ensures` for the final property. Verus loop invariants are declarations inside the loop, not an `invariant(...)` call. The transition code remains executable; `proof fn` lemmas establish algebraic facts about it.

evidence and limits: algorithm problems are 21/200 in AMBER (Table 4, p. 17). Specialized provers perform poorly on this structural task even when they do well on theorem proving. The paper attributes this to “tactical overfitting”, where models attempt to close the proof while ignoring the definition block (Section 5.2, p. 7). Inference: the benchmark isolates algorithm synthesis but does not establish that its selected algorithms are numerically stable or efficient beyond the formalized properties.

## technique 3: representation-transformation construction

what it is: require the agent to define a target problem's domain, constraints, and objective, then prove a formal relation between source and target. The paper defines relaxation by requiring each feasible source x to map to a feasible target y with identical objective value, and defines equivalence by mutual relaxation (Section 3.3, pp. 5–6). This makes modeling transformations explicit instead of asking only for a proof about an already supplied target.

how to apply it:
1. declare source problem Psrc=(X,C,f) and target Ptgt=(Y,C′,f′) (Section 3.3, p. 5)
2. construct Y, C′, and f′ in Lean (Section 3.3, p. 6)
3. define the map or witness relating feasible source and target solutions (Section 3.3, p. 5)
4. prove the relaxation relation and, when required, the reverse relation for equivalence (Section 3.3, p. 6)

Verus form: Inference: model the source and target as spec-level structs, use `spec fn` maps between mathematical states, and prove feasibility and objective equalities with `ensures` and lemmas. Keep the transformation executable only where the product needs runtime conversion; Verus will not infer the mathematical map from a type declaration.

evidence and limits: representation transformations are 19/200 problems (Table 4, p. 17). The paper's illustrative LP transformation requires adding a slack variable and proving equivalence, which tests global type definitions and library retrieval rather than local tactic search (Appendix B.2, pp. 17–18). The benchmark therefore measures specification construction and proof together; a model can fail before any deep theorem proving.

## technique 4: semantic dependency analysis for benchmark difficulty

what it is: reconstruct each Lean file's elaborated environment, traverse the target theorem's typed abstract syntax tree, and collect non-trivial declarations within graph distance k. For problem p, the paper defines dependency density ρk(p) as the set of domain concepts v with 1≤distG(p,v)≤k after filtering trivial syntax (Section 5, p. 6). This measures conceptual load rather than token count.

how to apply it:
1. elaborate source files with Lean's compiler to resolve imports and namespaces (Section 5, p. 6; Appendix C.1.1, p. 17)
2. traverse each theorem expression tree and collect its constants (Appendix C.1.1, p. 17)
3. build the directed declaration-usage graph G (Section 5, p. 6)
4. remove trivial connectives and basic types, then count concepts within radius k (Section 5, p. 6)
5. compare dependency density across benchmarks or use it to stratify tasks (Section 5, p. 6)

Verus form: Inference: parse Verus/Rust modules after name resolution, build a graph from specifications, lemmas, imports, and referenced types, and stratify proof tasks by non-trivial dependency radius. This is evaluation infrastructure; it does not prove a Rust property.

evidence and limits: the authors use radius k=3 and report AMBER's higher semantic dependency density than comparison benchmarks (Section 5, p. 6). The measure depends on which declarations are marked trivial and on elaboration success. It is therefore a complexity proxy, not a direct measure of proof effort.

## technique 5: structured prompting and failure audit

what it is: compare a construction-verification prompt against standard code completion and proof-only prompts, then classify generated failures. On a 100-problem optimization/convex-analysis subset, the structured prompt solves 8/100, standard completion 6/100, and proof-only 5/100 (Table 3, p. 8). The paper's prompt requires filling both construction and theorem placeholders, and a solved problem must compile both.

how to apply it:
1. provide imports, variables, and the structural template for the task type (Section 5.1, p. 7)
2. require a computable definition before the verification theorem (Appendix D.4, p. 22)
3. sample 16 outputs per problem and calculate unbiased Pass@k (Section 5.1, p. 7; Appendix D.3)
4. classify failures by hallucinated identifiers, formalization competence, incomplete output, or formatting (Section 5.4, p. 8)
5. report the denominator and prompt/model for every rate

Verus form: Inference: prompt a VL agent to produce executable Rust first and Verus proof obligations second, then run the verifier on every sample. Record whether failure came from Rust compilation, specification mismatch, or proof search. Do not count a generated contract with `external_body` as proof of the function it replaces.

evidence, contradictions, and trusted scope: the paper manually classifies 3,189 DeepSeek-R1 error messages. It reports hallucination 47.3% (1,512 cases), formalization competence 32.7%, incomplete outputs 15.2% (487), and formatting 4.8% (154) (Section 5.4, p. 8). The percentages are rounded and their displayed case counts cover only categories with explicit counts; 1,512/3,189 is approximately 47.4%, so the paper's 47.3% is internally approximate. Lean compilation is the check for accepted outputs, while model adherence, Mathlib declarations, and the benchmark's formalization remain trusted inputs. The paper concludes that specialized theorem provers can be worse at multi-stage applied tasks despite strong local proof skill (Section 5.2, p. 7). Inference: this is a direct warning against choosing a Verus model solely by isolated proof completion.

## implications for VL

Inference: VL should separate construction of executable Rust from proof of its contract, require both artifacts to pass Verus, and benchmark algorithm and representation tasks separately from lemma proving. AMBER already covers the product risk of proof-only agents that return logically valid but non-computational witnesses. VL should record Pass@k denominators, model, task category, and exact verifier outcome; otherwise a success rate can hide whether construction or verification failed. Inference: the benchmark's explicit templates and semantic-dependency analysis are worth reusing, while its Lean syntax and Mathlib-specific retrieval should not be copied as if they were Verus mechanisms.

## techniques for the catalog

- two-stage construction verification — define a computable solution from raw parameters, then prove its property
- recursive algorithm formalization — expose initialization and transition rules before proving invariants or convergence
- representation transformation proof — construct target domains and maps, then prove relaxation or equivalence
- semantic dependency density — measure non-trivial typed declaration dependencies to stratify formal tasks
- structural prompt and failure audit — enforce construction-first output and classify compile/proof failures with denominators
Checked 2026-10-15 against paper yang2026constructionverification: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
