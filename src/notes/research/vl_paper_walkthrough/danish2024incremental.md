# Incremental units-of-measure verification
(authored by agents unless marked 🧑)
Tag: `danish2024incremental`, [paper](http://arxiv.org/abs/2406.02174v1)

## purpose and architecture

This paper presents a static units-of-measure checker for Fortran that is designed for incomplete annotations and large modular programs. Its abstract states: “We attempt to address this issue by providing a lightweight static veriﬁcation system for units-of-measure in Fortran programs which supports incremental annotation of large projects.” (Abstract, p. 1). The authors deliberately generate one global constraint system, infer missing units, and then partition the problem at module boundaries. They report an implementation as an extension to CamFort, an open-source Fortran analysis tool (Abstract and Section 1, pp. 1–2).

The workflow has four stages: syntax-directed constraint generation (Section 3.1, p. 6), interprocedural polymorphic instantiation (Section 3.2, p. 10), solving the resulting linear Diophantine equations using a modified Hermite Normal Form procedure (Section 3.3, pp. 12–15), and optional separate module analysis with stored signatures (Section 3.5, pp. 16–17). The annotations are comments, so compilers and unrelated tools can ignore them (Section 1, p. 2). The paper's concrete commands are `camfort units-suggest`, `camfort units-infer`, `camfort units-synth`, and `camfort units-compile` (Section 2.1, pp. 2–3; Section 2.3, pp. 4–5).

## technique 1: incremental annotations and inference

What it is: annotate only enough variables to constrain the rest, infer all compatible units, then synthesize comments containing the inferred specifications. In the ballistics example (x(t)=\frac12at^2+v_0t+x_0), `units-suggest` proposes `a`, `v0`, and `x`; the user annotates those three and `units-infer` assigns units to every variable (Section 2.1, pp. 2–4, Listings 1–2). The paper says, “We could annotate every variable using our comment-based syntax, but to save work we ﬁrst ask our system to suggest a small set of variables that is suﬃcient to determine the others, by the command camfort units-suggest (Listing 1, right).” (Section 2.1, p. 2).

Steps from the paper:

1. Add the program's equations and run `camfort units-suggest` to obtain a sufficient subset of variables (Listing 1, p. 3).
2. Add comment annotations such as `!= unit metre :: x` and `!= unit metre / sec :: v0` (Figure 1 and Listing 2, pp. 3–4).
3. Run `camfort units-infer`; inspect inferred units and any inconsistency (Listing 2, p. 4).
4. Run `units-synth` to rewrite a copy of the source with inferred comments for future checking and maintenance (Section 2.1, p. 3).

Verus form: Inference: represent a unit as a spec-level exponent map (for example, a `Map` from base-unit identifiers to integer powers), define `spec fn` multiplication, division, and power, and put unit equality in `requires`/`ensures` contracts. Inference: a `proof fn` can establish that a particular expression's unit map equals the declared result; unlike CamFort comments, Verus contracts are part of the verification input and require proofs at each call boundary. Inference: `units-suggest` has no direct Verus equivalent; a separate analysis could choose which `requires` declarations to add first.

Evidence and limits: the ballistics example is a worked demonstration, not a measured benchmark. Inference: meaningful results require annotations that express programmer intent. Inference: inferred consistency cannot detect a physically wrong but algebraically consistent unit declaration.

## technique 2: units polymorphism with literal restrictions

What it is: allow generic functions to preserve or transform arbitrary units. Listing 3 defines `d` with parameter and result unit `'a`, and `sqr` with result `'a**2`; the same function is called with metres and seconds (Section 2.2, pp. 3–4). The inference rules create abstract units variables inside polymorphic function contexts (Section 3.1, pp. 6–8). Addition and comparison generate equality constraints; multiplication combines unit exponents; division subtracts exponents; integer powers multiply exponents (Figure 3, p. 7).

The key soundness restriction is that only the literal zero may receive polymorphic units. “If any other literal value could have polymorphic units then a simple scalar multiplication would unify with any units, rendering the checking procedure useless.” (Section 3.1.2, p. 8). Nonzero literals are allowed without a constraint only when assigned directly to a monomorphically annotated variable (Figure 5 and Section 3.1.2, pp. 8–10). This supports named conversion factors, such as `!= unit cm/in :: inchesToCm`, while preventing polymorphic loops from faking dimensional invariance (Sections 3.1.3–3.1.4, p. 9).

Steps from the paper:

1. Mark a generic parameter and result with the same `'a`, or use `'a**2` for a square-like result (Listing 3, p. 4).
2. Generate compositional constraints for each expression using Figure 3's rules (Section 3.1.1, pp. 7–8).
3. In polymorphic contexts, give zero fresh polymorphic units and other literals unitless units. Outside such contexts, generate fresh units variables for literals. Allow direct nonzero literal assignments to monomorphically annotated variables without generating a constraint (Section 3.1.2, pp. 8–9; Figure 5, p. 10).
4. Enforce the literal restrictions to preserve dimensional invariance, and report inconsistent unit constraints; the paper does not describe a separate dimensional-invariance test (Section 3.1.4, p. 9; Section 3.3, p. 12).

Verus form: Inference: define a ghost unit exponent type parameter or explicit unit map and prove generic functions' unit transformations with `ensures`; use `requires` to constrain conversion factors to a monomorphic map. Inference: Verus's type system does not infer these maps automatically, so the polymorphic behavior must be stated and proved rather than inferred from comments. Inference: a Verus proof should preserve the paper's restriction by refusing unconstrained nonzero constants in generic contracts.

Evidence: the paper gives explicit `double` and `square` programs (Listing 3) and counterexamples showing why unrestricted polymorphic literals are unsound (Section 3.1.4, p. 9). No success percentage is reported. Inference: this technique is suitable for API contracts where dimensional invariance matters, but it does not by itself validate physical constants or nonlinear functions such as logarithms.

## technique 3: interprocedural instantiation and modular summaries

What it is: collect each function’s constraints in a template, instantiate polymorphic templates at call sites, and summarize modules by solved interface signatures. The paper identifies call instances as pairs `(fs, i)` and replaces abstract units variables with call-specific units variables (Section 3.2, pp. 10–12). For separate analysis, it stores module maps in `fsmod` files, solves parameter units, and drops internal constraints while retaining a minimal signature (Section 3.5, pp. 16–17).

Steps from the paper:

1. Gather constraints for every program unit and store polymorphic templates (Section 3.2, p. 10).
2. For each call instance, remap nested call identifiers to fresh identifiers and instantiate abstract units variables. Stop recursive expansion at a call-graph cycle: recursive calls must retain the first instantiation’s units. Calls through an `external` function parameter share call identifier 0, so arbitrary-rank polymorphism is unsupported (Section 3.2, pp. 10–12; Section 3.1.5, p. 9).
3. For a module, solve parameter relationships, discard internal constraints, and save a compact `fsmod` summary using `units-compile`; client `units-infer` loads it automatically (Section 2.3, pp. 5–6; Section 3.5, pp. 16–17).
4. Annotate a stand-in stub module for an unavailable third-party library and compile it to an `fsmod` file (Section 3.5, pp. 16–17).

The paper reports that a Navier–Stokes main module importing about 5,000 constraints needed 471 after signature reduction, yielding roughly a 5× overall solving speedup (Section 3.5, p. 16). The denominator is one stated test case; it is not an average across projects.

Verus form: Inference: model each verified Rust module's public unit or dimension relation as a `spec fn` contract and prove callers against that contract; keep implementation lemmas private. Inference: this resembles Verus's contract-based modular proofs, but `fsmod` inference and automatic signature minimization would require an external preprocessor. Inference: foreign code could be represented by a trusted external specification; documenting that trust is a proposed practice, not a result of this paper.

## technique 4: scalability and case-study checking

The authors synthesized programs varying number of functions (n\in\{5,10,15\}), function length (l\in\{5,10,15,20\}), arguments (a\in\{2,4\}), and single versus multiple files (Section 4, pp. 17–18). They measured the mean of five trials and standard error on a 3.2 GHz Intel Core i5 with 16 GB RAM running Mac OS 10.13.4 (Section 4, p. 18). For the (n=15,l=20,a=2) case, single-file inference took 1,009.508±0.417 seconds for 664 lines, while separate analysis took 8.496±0.107 seconds for 723 lines (Table 1, p. 19). These are means over five trials, not success rates. Separate analysis includes `units-compile` for the modules followed by `units-infer` for the top-level program (Section 4, p. 18): “For the multi-ﬁle programs, we ran our tool in units-compile mode to generate intermediate precompiled ﬁles then used units-infer on the top-level program, importing the precompiled ﬁles.” Real packages included Navier (517 lines, 6 files, 10.241±0.303 s), cliffs (2,706 lines, 30 files, 40.881±0.121 s), and three WRF modules (Table 2, p. 19).

Case studies on WRF found a grams-to-micrograms conversion using (10^{-6}) instead of (10^6), an intermediate wind-speed inconsistency, and an undocumented Kelvin/Celsius conversion (Section 5, pp. 19–20). The authors do not claim every flagged issue is a bug. The Kelvin/Celsius case concerns temperature changes in a pressure derivative (Section 5, pp. 19–20): “One term used a change-in-Kelvin while the other used a change-in-Celsius. In this case, these are compatible quantities.”

## what is proved and trusted

The paper formalizes constraint-generation rules and proves that its modified HNF procedure terminates and outputs integer matrices. The exact theorem statements are “For any matrix given as input, the modiﬁed-HNF procedure terminates.” (Theorem 3.6, p. 14) and “The modiﬁed-HNF procedure outputs only integer matrices.” (Theorem 3.7, p. 15). It also measures runtime on synthetic and real Fortran programs (Section 4, pp. 17–19). Inference: using the results relies on user annotations, the source-language model, the CamFort implementation, and the interpretation of physical units. Inference: a Verus port would additionally trust the chosen unit-map model, Verus and Z3, compiler and library contracts, and any unchecked conversion constants.

## techniques for the catalog

- incremental unit inference: annotate a small suggested subset, infer the rest, and synthesize persistent comments
- polymorphic units: express generic unit relationships such as `'a` and `'a**2` while restricting nonzero literals for soundness
- interprocedural instantiation: instantiate polymorphic templates at call sites with fresh unit variables
- modular summaries: solve and cache compact function signatures at module boundaries, including annotated stubs for unavailable libraries
- HNF constraint solving: reduce unit equations to linear Diophantine form and solve with a modified Hermite Normal Form algorithm
- scalability evaluation: compare single-file and separate-module solving using five-trial means and standard errors
