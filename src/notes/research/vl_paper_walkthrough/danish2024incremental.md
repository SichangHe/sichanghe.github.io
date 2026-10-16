# Incremental units-of-measure verification
(authored by agents unless marked 🧑)
Tag: `danish2024incremental`, [paper](http://arxiv.org/abs/2406.02174v1)

## purpose and architecture

This paper presents a static units-of-measure checker for Fortran that is designed for incomplete annotations and large modular programs. Its abstract states: “We attempt to address this issue by providing a lightweight static veriﬁcation system for units-of-measure in Fortran programs which supports incremental annotation of large projects.” (Abstract, p. 1). The authors deliberately generate one global constraint system, infer missing units, and then partition the problem at module boundaries. They report an implementation as an extension to CamFort, an open-source Fortran analysis tool (Abstract and Section 1, pp. 1–2).

The workflow has four stages: syntax-directed constraint generation (Section 3.1, p. 6), interprocedural polymorphic instantiation (Section 3.2, p. 10), solving the resulting linear Diophantine equations using a modified Hermite Normal Form procedure (Section 3.3, pp. 12–16), and optional separate module analysis with stored signatures (Section 3.5, pp. 16–17). The annotations are comments, so compilers and unrelated tools can ignore them (Section 1, p. 2). The paper's concrete commands are `camfort units-suggest`, `camfort units-infer`, `camfort units-synth`, and `camfort units-compile` (Section 2.1, pp. 2–3; Section 2.3, pp. 4–5).

Inference: the transferable idea for VL is a staged checker that can begin with a few trusted declarations, infer the rest, and cache compact interface summaries. Verus does not provide this exact units analysis; a Verus implementation would encode a finite units algebra in specifications and prove arithmetic relationships separately.

## technique 1: incremental annotations and inference

What it is: annotate only enough variables to constrain the rest, infer all compatible units, then synthesize comments containing the inferred specifications. In the ballistics example (x(t)=\frac12at^2+v_0t+x_0), `units-suggest` proposes `a`, `v0`, and `x`; the user annotates those three and `units-infer` assigns units to every variable (Section 2.1, pp. 2–3, Listings 1–2). The paper says, “We could annotate every variable using our comment-based syntax, but to save work we first ask our system to suggest a small set of variables that is suﬃcient to determine the others.” (Section 2.1, p. 2).

Steps from the paper:

1. Add the program's equations and run `camfort units-suggest` to obtain a sufficient subset of variables (Listing 1, p. 3).
2. Add comment annotations such as `!= unit metre :: x` and `!= unit metre / sec :: v0` (Figure 1 and Listing 2, pp. 3–4).
3. Run `camfort units-infer`; inspect inferred units and any inconsistency (Listing 2, p. 4).
4. Run `units-synth` to rewrite a copy of the source with inferred comments for future checking and maintenance (Section 2.1, p. 3).

Verus form: Inference: represent a unit as a spec-level exponent map (for example, a `Map` from base-unit identifiers to integer powers), define `spec fn` multiplication, division, and power, and put unit equality in `requires`/`ensures` contracts. Inference: a `proof fn` can establish that a particular expression's unit map equals the declared result; unlike CamFort comments, Verus contracts are part of the verification input and require proofs at each call boundary. Inference: `units-suggest` has no direct Verus equivalent; a separate analysis could choose which `requires` declarations to add first.

Evidence and limits: the ballistics example is a worked demonstration, not a measured benchmark. The method assumes the annotations and equations correctly express programmer intent. Inference: inferred consistency cannot detect a physically wrong but algebraically consistent unit declaration.

## technique 2: units polymorphism with literal restrictions

What it is: allow generic functions to preserve or transform arbitrary units. Listing 3 defines `d` with parameter and result unit `'a`, and `sqr` with result `'a**2`; the same function is called with metres and seconds (Section 2.2, pp. 3–4). The inference rules create abstract units variables inside polymorphic function contexts (Section 3.1, pp. 6–8). Addition and comparison generate equality constraints; multiplication combines unit exponents; division subtracts exponents; integer powers multiply exponents (Figure 3, p. 7).

The key soundness restriction is that only zero may receive polymorphic units. “If any other literal value could have polymorphic units then a simple scalar multiplication would unify with any units, rendering the checking procedure useless.” (Section 3.1.2, p. 8). Nonzero literals are allowed without a constraint only when assigned directly to a monomorphically annotated variable (Figure 5 and Section 3.1.2, pp. 9–10). This supports named conversion factors, such as `!= unit cm/in :: inchesToCm`, while preventing polymorphic loops from faking dimensional invariance (Sections 3.1.3–3.1.4, pp. 9–10).

Steps from the paper:

1. Mark a generic parameter and result with the same `'a`, or use `'a**2` for a square-like result (Listing 3, p. 4).
2. Generate compositional constraints for each expression using Figure 3's rules (Section 3.1.1, pp. 7–8).
3. Treat zero as polymorphic, other literals as unitless in polymorphic contexts, and permit nonzero literal assignment only to monomorphic units (Sections 3.1.2–3.1.4, pp. 8–10).
4. Reject programs whose constraints cannot be satisfied or whose polymorphic literal use breaks dimensional invariance (Section 3.1.4, p. 10).

Verus form: Inference: define a ghost unit exponent type parameter or explicit unit map and prove generic functions' unit transformations with `ensures`; use `requires` to constrain conversion factors to a monomorphic map. Inference: Verus's type system does not infer these maps automatically, so the polymorphic behavior must be stated and proved rather than inferred from comments. Inference: a Verus proof should preserve the paper's restriction by refusing unconstrained nonzero constants in generic contracts.

Evidence: the paper gives explicit `double` and `square` programs (Listing 3) and counterexamples showing why unrestricted polymorphic literals are unsound (Section 3.1.4, p. 10). No success percentage is reported. Inference: this technique is suitable for API contracts where dimensional invariance matters, but it does not by itself validate physical constants or nonlinear functions such as logarithms.

## technique 3: interprocedural instantiation and modular summaries

What it is: infer each polymorphic function once as a template, instantiate it separately at each call site, and summarize modules by solved interface signatures. The paper identifies call instances as pairs `(fs, i)` and recursively substitutes concrete units into the template (Section 3.2, p. 10). For separate analysis, it stores module maps in `fsmod` files, solves parameter units, and drops internal constraints while retaining a minimal signature (Section 3.5, pp. 16–17).

Steps from the paper:

1. Gather constraints for every program unit and store polymorphic templates (Section 3.2, p. 10).
2. Find every call identifier and instantiate the corresponding template with fresh call-specific variables (Section 3.2, p. 10).
3. For a module, solve parameter relationships and save a compact `fsmod` summary; reload it with `units-compile` when analyzing clients (Section 3.5, pp. 16–17).
4. Use a stub module with declared units for an unavailable third-party library (Section 3.5, p. 17).

The paper reports that a Navier–Stokes main module importing about 5,000 constraints needed 471 after signature reduction, yielding roughly a 5× overall solving speedup (Section 3.5, p. 17). The denominator is one stated test case; it is not an average across projects.

Verus form: Inference: model each verified Rust module's public unit or dimension relation as a `spec fn` contract and prove callers against that contract; keep implementation lemmas private. Inference: this resembles Verus's contract-based modular proofs, but `fsmod` inference and automatic signature minimization would require an external preprocessor. For foreign code, Verus can use an explicitly trusted external specification only when the trust boundary is documented.

## technique 4: scalability and case-study checking

The authors synthesized programs varying number of functions (n\in\{5,10,15\}), function length (l\in\{5,10,15,20\}), arguments (a\in\{2,4\}), and single versus multiple files (Section 4, pp. 17–18). They measured the mean of five trials and standard error on a 3.2 GHz Intel Core i5 with 16 GB RAM running Mac OS 10.13.4 (Section 4, p. 18). For the largest (n=15,l=20,a=2) case, single-file inference took 1,009.508±0.417 seconds for 664 lines, while multi-file inference took 8.496±0.107 seconds for 723 lines (Table 1, p. 19). These are means over five trials, not success rates. Real packages included Navier (517 lines, 6 files, 10.241±0.303 s), cliffs (2,706 lines, 30 files, 40.881±0.121 s), and three WRF modules (Table 2, p. 19).

Case studies on WRF found a grams-to-micrograms conversion using (10^{-6}) instead of (10^6), an intermediate wind-speed inconsistency, and an undocumented Kelvin/Celsius conversion (Section 5, pp. 19–20). The authors do not claim every flagged issue is a bug; the Kelvin/Celsius case is described as compatible for the stated derivative ranges (Section 5, p. 20).

Inference: the threat to agent-written verified Rust is moderate and specific: dimensional contracts can catch unit algebra errors, but the paper shows that domain documentation and conversion intent remain human inputs. VL should not redo this algorithm; it should reuse the modular-summary and incremental-annotation ideas when adding domain-specific units to Verus APIs.

## what is proved and trusted

The paper formalizes constraint-generation rules, proves termination and integer solutions for its modified HNF algorithm (Section 1, p. 2; Section 3.3, pp. 12–16), and measures runtime on synthetic and real Fortran programs. It trusts user annotations, source semantics, the CamFort implementation, and the interpretation of physical units. Inference: a Verus port would additionally trust the chosen unit-map model, Verus and Z3, compiler and library contracts, and any unchecked conversion constants.

## techniques for the catalog

- incremental unit inference: annotate a small suggested subset, infer the rest, and synthesize persistent comments
- polymorphic units: express generic unit relationships such as `'a` and `'a**2` while restricting nonzero literals for soundness
- interprocedural instantiation: instantiate polymorphic templates at call sites with fresh unit variables
- modular summaries: solve and cache compact function signatures at module boundaries, including trusted stubs for unavailable libraries
- HNF constraint solving: reduce unit equations to linear Diophantine form and solve with a modified Hermite Normal Form algorithm
- scalability evaluation: compare single-file and separate-module solving using five-trial means and standard errors
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
