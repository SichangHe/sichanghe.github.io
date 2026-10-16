# Why3-py: A Tool for Formal Verification of Hypothesis Testing and Meta-Analysis in Python
(authored by agents unless marked 🧑)
Tag: `tanaka2026why3py`, [paper](http://arxiv.org/abs/2607.03951v2)

## scope and contribution
The paper presents Why3-py, a Python front end that translates annotated Python into WhyML and uses Why3 to verify statistical-method usage. Its target is the assumptions and interpretations attached to hypothesis tests and meta-analyses, rather than proving SciPy implementations. The authors state: “Our goal is not to verify implementations, but to ensure the correct use of statistical methods, e.g., detecting incorrect integration of p-values in meta-analysis.” (section 1, page 2). The logic is Belief Hoare Logic (BHL): a program has a precondition describing assumptions and a postcondition describing the statistical belief produced. “In this framework, specifications may include both verifiable properties and assumption-based statements.” (section 2, page 3). Thus a proof separates deductive obligations from assumptions about an unknown population.

## technique: annotate statistical intent with BHL contracts
What it is: write preconditions for data and method assumptions, and postconditions for the belief justified by the test. When to use it: whenever a statistical function's validity depends on sampling, distribution, independence, or interpretation assumptions that ordinary type checking cannot express.

How to apply it:
1. Represent the statistical procedure as a program `C`, and write a precondition `ψpre` such as “the dataset has been sampled from a normal distribution” (section 2, page 3).
2. Write a postcondition `φpost` using the belief modality, for example `K≤0.05_y,A φ`, meaning that test `A` on dataset `y` supports `φ` at p-value at most 0.05 (section 2, page 3).
3. Check the judgment `Γ ⊢ {ψpre} C {φpost}`; deriving it means the program yields the claimed statistical belief whenever its requirements hold (section 2, page 3).
4. Keep empirical assumptions explicit: BHL does not prove that a true population is normal; it makes that assumption visible and prevents an unannotated analysis from being accepted.

Verus form (Inference): model the executable Rust function with a `requires` clause for machine-checkable input facts and an `ensures` clause for the returned result. Keep population assumptions as explicit precondition predicates supplied by the caller; Verus can prove the contract implication but cannot establish an unobservable distributional fact from one dataset. The paper's modal belief operators have no direct Verus equivalent, so represent the justified conclusion as a ghost predicate or result type.

Evidence and limits: the paper's Fisher example uses three p-values, and the precondition checks that they are in [0,1], that the analyst intends to detect an excess of small p-values, and that the decision rule maps harm in any experimental situation to reporting risk (section 3, pages 4–5). Verification fails when publication-bias protection is missing; the undischarged VC points to the missing requirement that p-values were not collected under publication bias. This catches a misuse that would not cause a runtime error. The limitation is that the requirement itself remains an assumption.

## technique: mixed Python–WhyML front end
Why3-py extends Why3's micro-Python plugin with real arithmetic, keyword arguments, and WhyML specifications embedded in comments. “A programmer specifies the requirements and the interpretation of this function by annotating the code with the precondition in the requires clause and the postcondition in the ensures clause using Gospel.” (section 3, page 4). A `#@` line is lexed as WhyML rather than discarded as a Python comment. The parser coordinates Python and WhyML lexers, backtracking to the WhyML lexer when Python parsing fails (section 4, page 7). It translates Python calls to WhyML calls, keyword arguments to records, ordinary lists to WhyML arrays, and `Cons`/`Nil` constructions to WhyML lists (section 4, page 7).

How to apply it: restrict input to code mypy can type-check; put logical expressions and contracts on `#@` lines; provide explicit annotations for statistical-library functions; run mypy first; translate the typed AST; generate Why3 verification conditions; discharge them with Why3 and an SMT solver. Why3-py requires explicit external-library annotations because mypy cannot infer those contracts.

Verus form (Inference): replace the comment parser with Rust's native `requires`/`ensures`, typed vectors or sequences, and ghost specifications. Use `seq` or `Set` predicates for p-value collections and ordinary Rust numeric types with explicit conversions. Dynamic Python features that are outside Why3-py's mypy subset should likewise be excluded from a Verus target.

## technique: specification-based abstraction of libraries
The tool does not verify SciPy or statsmodels internals. “Instead of modeling the implementations of external functions, we associate them with logical contracts that formalize their behavior in our StatWhy 1.4 modules.” (section 4, page 7). Verification therefore proves correct use under assumed contracts. Use this when a trusted numerical library is too large to verify but its mathematical behavior can be stated as a contract.

Verus form (Inference): declare an external mathematical function as a specification function or trusted boundary, then prove callers satisfy its `requires` and consume its `ensures`. The library implementation remains trusted unless separately verified; do not mark the function being verified as `external_body`.

## technique: detect p-hacking and meta-analysis misuse
StatWhy 1.4 supplies specifications for Fisher, Stouffer, and Mantel–Haenszel methods. Why3-py checks around 20–40 AST nodes for meta-analysis examples and around 30 AST nodes for multiple-comparison examples (section 5, pages 7–8). The evaluation reports verification within 8 seconds for practical numbers (2–30) of studies. Multiple-comparison timings are for approximately 40-line programs, cvc5 1.1.2, Debian 13, an Intel Core i7-8650U, and 24 GB memory: Tukey HSD takes 10.90 seconds for 2 groups (1 comparison) and 87.86 seconds for 7 groups (21 comparisons); Dunnett takes 10.03 seconds for 2 groups (1 comparison) and 35.39 seconds for 7 groups (6 comparisons); Steel–Dwass takes 10.61 seconds for 2 groups and 93.72 seconds for 7 groups (section 5, table 1, page 8). These denominators are group counts and pairwise comparisons as shown in the table.

Verus form (Inference): encode each method's admissibility conditions as reusable proof predicates and require them at the aggregation function boundary. Prove that a result is only interpreted under those predicates; this addresses specification misuse, while numerical algorithm correctness requires a separate proof.

## techniques for the catalog
- BHL statistical contracts: express data and interpretation assumptions as preconditions and statistical beliefs as postconditions
- typed mixed-language verification: run static typing, parse embedded specifications, and translate the typed AST to WhyML
- library contract abstraction: verify calls against logical contracts while trusting separately implemented numerical libraries
- misuse detection for meta-analysis: use method-specific specifications to expose missing publication-bias and p-hacking requirements
- scalability measurement: report solver, hardware, program size, group/study denominator, and verification times
