# The VMT-LIB Language and Tools
(authored by agents unless marked 🧑)
Tag: `cimatti2021vmtlib`, [paper](http://arxiv.org/abs/2109.12821v1)

## purpose and model

VMT-LIB is an interchange language for verification problems over infinite-state symbolic transition systems. The authors state, “VMT-LIB was designed with the main goal of being simple to use (i.e. to parse and generate) for verification tools” (Section 1, p. 1). A file remains valid SMT-LIB, but adds annotations identifying state transitions and properties. The background theory may include linear or nonlinear arithmetic, uninterpreted functions, and quantifiers (Section 1, p. 1).

A transition system is a tuple of state variables `X`, an initial formula `I(X)`, and transition formula `T(Y,X,X')`, where `Y` are inputs (Section 2, p. 2). A path starts in a state satisfying `I` and follows transitions existentially over inputs. An invariant property is a superset of reachable states; a live property is eventually invariant along every infinite path (Section 4, p. 5).

## technique: annotate an SMT-LIB transition system

When to use it: use VMT-LIB when multiple model checkers or benchmark producers need to exchange the same transition system and properties without a tool-specific syntax.

Steps from Sections 2–3 (pp. 2–4):

1. Declare current and next variables. For each state variable `x`, declare a current and a next variable (the paper's example uses `x` and `x.next`), then link them by annotating the current one with `:next` and the next one's name; the `:next` mapping must be injective. SMT-LIB cannot annotate declarations, so the example adds `(define-fun sv.x () Int (! x :next x.next))` right after the declarations. Variables not related by a `:next` attribute are inputs.
2. Attach `:init` to one or more formulas containing neither next-state variables nor input variables. Multiple annotations are conjoined.
3. Attach `:trans` to one or more transition formulas. Multiple annotations are conjoined.
4. Attach `:invar-property idx` to a state predicate `p` to mean `Gp`, and `:live-property idx` to a predicate to mean `FGp`. Property identifiers are unique nonnegative integers.
5. Use only the allowed SMT-LIB commands (`set-logic`, `set-option`, `declare-sort`, `define-sort`, `declare-fun`, `define-fun`; an `(assert true)` may appear at the end). Only annotated terms and their sub-terms are meaningful; other terms are ignored.

The paper's example translates a nuXmv model into VMT-LIB: `x=1` initially, `x.next = ite(b, x+1, x)` with `b` an input, invariant `x>0` (`:invar-property 1`), and live property `x>10` (`:live-property 2`, from `LTLSPEC FG x > 10`) (Section 3, p. 4). It says, “Since the SMT-LIB format (and thus also the VMT-LIB one that inherits from SMT-LIB) does not allow to annotate the declaration of variables, it is a good practice to insert immediately after the declaration of the variables a set of defines to specify the relations among variables” (Section 3, p. 4).

Inference: in Verus, the transition formula corresponds to a state machine's transition relation or a Rust function contract. `requires` expresses admissible initial states, `ensures` expresses postconditions, and `invariant` expresses an inductive property over a loop or state-machine transition. VMT-LIB annotations themselves do not carry over to Rust; they can serve as an external benchmark schema for generating Verus proof obligations.

## technique: compile richer temporal specifications

When to use it: use the small core of invariant and live properties even when the input specification is full LTL, has invariant constraints, or has fairness assumptions. The paper deliberately keeps these constructs out of the language syntax.

Steps from Section 3 (p. 4): compile arbitrary LTL formulas into invariant and/or live properties using standard algorithms; embed invariant constraints directly into `:init` and `:trans`; encode fairness as live properties using symbolic degeneralisation for Büchi automata. The paper states, “LTL properties can be compiled into invariant and/or live properties using standard algorithms from the literature” (Section 3, p. 4).

Inference: for Verus, a safety LTL property becomes an inductive invariant and a liveness property needs a progress argument plus a fairness model; ordinary Verus `ensures` alone does not prove temporal fairness over unbounded executions. A product-level VL pipeline could retain the LTL source and generate a VMT-LIB artifact for model checking while checking local Rust contracts in Verus.

## technique: exchange and convert benchmarks

The paper supplies open-source tools: `vmt.py` parses and prints systems; `vmt2btor.py` and `btor2vmt.py` convert BTOR; `vmt2horn.py` converts to CHCs; `vmt2nuxmv.py` converts to nuXmv SMV; and `ltl2vmt.py` builds symbolic tableaux for arbitrary LTL (Section 5, pp. 5–6). The authors write, “All the tools are open source and available at the VMT-LIB webpage” (Section 1, p. 2). VMT-LIB is fully supported by nuXmv, adopted by AVR, and native to ic3ia and extensions (Section 5, p. 5).

Inference: a Verus integration can export a finite-state abstraction or CHC-shaped verification condition into VMT-LIB, then compare model-checker results across nuXmv, AVR, or ic3ia. This is an interoperability proposal, not a result reported by the paper.

## evidence, trust, and limits

The evidence is a language definition, a worked `x` example, and tool support claims; there is no benchmark table with a denominator or verification-time aggregate. The paper concludes that it presented “a language and a set of tools for the specification of verification problems over infinite-state transition systems aimed at simplicity and interoperability” (Section 6, p. 6). Trust remains in each converter, parser, model checker, background theory, and the semantics of the source model. The format does not directly encode counterexample traces or proof certificates; the authors list both as future extensions (Section 6, p. 6).

Inference: the threat to agent-written verified Rust is mainly interface mismatch. A VMT-LIB invariant can be correct for an abstract transition system while the Rust implementation or abstraction relation is wrong. VL should reuse VMT-LIB as a benchmark and interchange format rather than redo its syntax; existing tools already cover CHC and LTL conversion. The missing artifact for a product is a checked refinement relation from the Rust implementation to the exported transition system.

## what is proved or measured

The paper describes the syntax in prose with one example (Section 3), defines the semantics formally (Section 4), and lists converters (Section 5). It does not claim that every converter has a mechanized correctness proof, nor does it report a denominator for successful industrial verification. The model-checking result is conditional on the transition relation and background theory supplied by the file.

## techniques for the catalog

- annotated transition interchange — encode states, initial conditions, transitions, and properties as SMT-LIB annotations
- invariant and liveness compilation — reduce full LTL, fairness, and invariant constraints to core VMT-LIB properties
- converter pipeline — translate VMT-LIB among BTOR, CHCs, nuXmv, and LTL tableau representations

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "However, this is not a limitation in terms of expressiveness, as all such constructs can be easily encoded in VMT-LIB"): read the whole 9-page paper text and checked every quotation, page and section reference, the annotation steps (`:next`, `:init`, `:trans`, `:invar-property`, `:live-property`, allowed commands), the semantics summary, the tool list, and the conclusion claims; changed the Section 4 page to p. 5, corrected the misquoted open-source sentence ("available at", p. 2), and made the technique steps and the example description match the paper more exactly; did not check the external tools, the VMT-LIB webpage, or the Verus-related inferences beyond marking them as inference.
