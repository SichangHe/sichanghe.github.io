# Enumerating Choice Terms in Model-Based Quantifier Instantiation
(authored by agents unless marked 🧑)
Tag: `kondylidou2026enumerating`, [paper](https://doi.org/10.1007/978-3-032-22752-2_15)

## scope and result

Kondylidou, Reynolds, Blanchette, and Tinelli extend cvc5's model-based quantifier instantiation with fast enumeration (MBQI-Enum) to handle Hilbert choice terms in higher-order logic. The paper's abstract states, “A weakness of MBQI-Enum is that it does not find refutations when Hilbert choice terms are necessary.” (abstract, p. 1). Their extension adds choice terms to the syntax-guided synthesis grammar, replaces each choice term with a fresh Skolem symbol, and adds lemmas expressing the choice axiom. It is evaluated on 3,757 parseable monomorphic higher-order TPTP TH0 problems, with a 60-second timeout per benchmark on a 40-core, 2.20 GHz Intel Xeon Silver 4114 machine with 192 GB RAM (section 5, pp. 308–309).

The strategy works by refutation: it assumes the negated conjecture and searches for an unsatisfiable set of instances. The paper says, “MBQI-Enum first constructs a grammar for each quantified variable in the formula. It then iteratively enumerates candidate terms generated from the grammar and checks each resulting instance against the current model.” (section 2, p. 299). When a candidate refutes the model, it becomes a substitution; when no candidate succeeds, the procedure falls back to standard MBQI. This fallback is why the authors say the extension can solve any problem the original MBQI can solve in principle.

## technique: model-based grammar enumeration

What it is. MBQI-Enum combines model-based quantifier instantiation with SyGuS enumeration. For each universally quantified variable, it builds a grammar from uninterpreted symbols in the full input, still-uninstantiated bound variables, theory symbols, and lambda-abstraction rules for higher-order variables.

How to apply it. (1) Build a candidate grammar for each quantified variable. (2) Enumerate lambda terms and applications systematically. (3) Substitute a candidate for the quantified variable. (4) Test whether the negated quantified body under that substitution is satisfiable in the current model. (5) Keep the candidate only when it refutes the model; otherwise continue enumeration. (6) Add the resulting instantiation lemma to the SMT problem and repeat. Example 2 enumerates `λx.x` and `λx.f x`; the second yields a contradiction after Skolemization and a quantifier-free solver check (section 2, pp. 299–300).

Verus form. Inference: Verus could encode the grammar as an inductive ghost term and prove that each generated term is well typed. A `proof fn` could establish that adding an instance preserves implication from the quantified formula. Verus does not supply an SMT model or higher-order satisfiability oracle, so the model check remains an external trusted service unless its result is imported as a checked certificate.

## technique: add Hilbert choice to the grammar

What it is. A choice term `εx.φ` denotes an x satisfying φ when one exists and an arbitrary value otherwise. The extension augments every eligible nonterminal with productions that generate such terms. The paper's three main modifications are quoted as: “First, we augment the SyGuS grammar to include ε terms. Second, we introduce fresh Skolem symbols that represent these ε terms, since this is simpler than implementing ε terms throughout the SMT solver. Finally, we generate lemmas corresponding to instances of ε’s characteristic axiom and add them to the solver.” (introduction, p. 296).

How to apply it. (1) For quantified variable `yi`, derive its return type. (2) Add an epsilon production whose bound variable has that type and whose predicate may use the bound variable, free variables, and symbols from the quantified formula. (3) Enumerate epsilon and ordinary terms together. (4) Normalize and filter each term before model testing. (5) Commit a successful substitution and carry the generated lemmas forward.

The paper's Example 1 uses `λy. εx. y = f x` as a left inverse of an injective `f`. It introduces fresh `h` and adds `∀y. ¬(∃x. y = f x) ∨ y = f (h y)`; instantiating with `h` contradicts the injectivity axiom and proves the existential left-inverse conjecture (section 1, p. 296).

Verus form. Inference: model epsilon as a ghost specification function with an explicit existence-or-arbitrary postcondition. If executable Rust needs a selected value, require a witness from the caller or use a deterministic implementation with a separate proof of the choice property. Verus cannot assume classical choice without adding an axiom or finite-domain construction, so the Skolem symbol must be treated as a logical abstraction with a stated contract.

## technique: purification and characteristic lemmas

What it is. The implementation does not keep epsilon syntax throughout cvc5. It replaces every epsilon term with a fresh Skolem symbol and generates an accompanying quantified lemma. The paper says, “Recall that each ε term is replaced with a fresh Skolem symbol, and an accompanying lemma is generated to relate the Skolem to the original ε term.” (section 4, p. 307).

How to apply it. (1) Encounter `εx.φ` during enumeration. (2) Allocate a fresh symbol `h` of the return type. (3) Replace the epsilon term by `h` in the candidate instance. (4) Add a lemma stating that `φ(h)` holds when the motivating existential condition is satisfiable, or that the condition is already satisfied otherwise. (5) Designate the Skolem application as the trigger for the generated quantified formula so later instantiation is guided toward `h`. (6) Add both ordinary instantiation lemmas and epsilon lemmas to the evolving formula set.

Verus form. Inference: represent each fresh symbol as an uninterpreted spec function and prove client lemmas against an explicit axiom-like `ensures` contract. Verus proofs remain sound only if the contract is itself justified; an `external_body` declaration would move the choice axiom into the trusted base and should not be mistaken for an implementation proof.

## technique: rewrite and filter candidate terms

The cvc5 implementation reuses a fast SyGuS enumerator that considers terms unique up to rewriting. During construction, the internal rewriter simplifies epsilon terms; for example, `εx. x = t` becomes `t` when x is not free in t. A callback discards every `εx.φ` where x does not occur free in φ. The authors also normalize choice terms through purification before they are considered as substitutions (section 4, pp. 307–308).

Inference: these rewrites reduce duplicate candidates and prevent vacuous choice terms, but they are heuristic completeness safeguards rather than a proof that every useful term remains. In Verus, the analogous filter would be a terminating executable predicate with a proof that rejected terms are redundant under a stated equivalence relation.

## technique: generalized substitution loop and progress controls

Algorithm 3 starts from a model-derived substitution, loops over quantified variables, constructs a grammar, enumerates candidates, tests `¬ψσ′` for satisfiability, updates the substitution on success, and finally returns the substitution plus generated lemmas (section 3, pp. 300–301). The implementation adds a progress-aware instantiation cache: failed substitutions are cached and not retested. It adds timeouts to subsolver calls, an option to prohibit nested MBQI, and lookahead Skolem symbols for quantified formulas not introduced during preprocessing (section 5, p. 308).

Inference: these controls address nontermination and repeated work but do not make higher-order search complete. The paper explicitly notes that pragmatic cvc5 strategies “do not seek refutational completeness” for higher-order problems (section 2, p. 298).

## evidence and denominator checks

On TPTP TH0, cvc5 with choice, `cvc5[C]`, solved 2,382 of 3,757 parseable benchmarks: 204 satisfiable and 2,178 unsatisfiable; it reported 154 unknown and 1,221 timeouts (Table 1, section 5, p. 309). The baseline `cvc5[M]` solved 2,359 total, comprising 204 satisfiable and 2,155 unsatisfiable, with 158 unknown and 1,240 timeouts (Table 2, p. 310). Thus the extension adds 23 unsatisfiable solves and loses none of the 204 satisfiable solves against that baseline, as the paper states. The percentages implied by these fractions are approximately 63.4% versus 62.8% total solved; the paper reports counts rather than percentages.

Against external provers, cvc5[C] solved 2,382, versus Satallax 2,358, Vampire 2,317, and Zipperposition 2,083 (Table 1). These are the same 3,757-problem denominator, with each system's unknowns and timeouts listed separately. The paper also reports 21 problems solved by no other cvc5 strategy and exactly one solved by no other system (section 5, pp. 309–310). Inference: the one-benchmark uniqueness claim is sensitive to the selected systems and timeout, not a general theorem about choice reasoning.

## proved, measured, and trusted

The paper proves no metatheory for cvc5's implementation. Its evidence is empirical benchmark solving under fixed hardware, parser exclusions, timeout, and strategy configurations. The solver's SAT/SMT core, rewriting, Skolemization, model construction, SyGuS enumerator, and generated lemmas remain trusted implementation components; the benchmark conjectures and higher-order semantics are assumptions of the evaluation. Inference: for agent-written verified Rust, the reusable lesson is to separate candidate generation from a checked proof artifact. A Verus project could use a similar search-and-filter architecture, but treating a model result or a generated Skolem lemma as a proof without a kernel-checked certificate would create a product threat. VL should not redo generic grammar enumeration; it should focus on extracting witnesses and contracts that Verus can check.

## techniques for the catalog

- model-based grammar enumeration — enumerate SyGuS-generated lambda terms and keep candidates that refute the current model
- epsilon grammar extension — add Hilbert-choice productions for quantified-variable result types
- Skolem purification — replace each choice term with a fresh symbol and emit its characteristic lemma
- trigger-guided lemmas — use Skolem applications as triggers for subsequent quantifier instantiation
- semantic candidate filtering — test substituted bodies in the current model before committing them
- rewrite and vacuity filtering — simplify epsilon terms and discard predicates whose bound variable is unused
- progress-aware search — cache failed substitutions, bound nested calls, and use lookahead symbols
Checked 2026-10-15 against paper kondylidou2026enumerating: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
