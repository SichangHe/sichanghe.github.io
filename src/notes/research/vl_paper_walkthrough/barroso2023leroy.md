# Leroy and Blazy Were Right: Their Memory Model Soundness Proof is Automatable
(authored by agents unless marked 🧑)
Tag: `barroso2023leroy`, [paper](https://doi.org/10.1007/978-3-031-25803-9_2)

## result
Barroso, Pereira, and Ravara translate Leroy and Blazy’s CompCert memory-model soundness development from Coq to Why3/WhyML, retaining a first-order axiomatization and adding an executable concrete model. The abstract reports that they “automated their formalization using Why3, significantly reducing the proof effort.” (abstract, p. 1). The target is proof automation for memory-model properties, not a new memory model.

The original Coq development had approximately 1070 lines of theorem/specification and 970 lines of proof script (Sec. 2.4, p. 6). The Why3 development has approximately 1040 lines of theorem/specification (Sec. 3, p. 6). The authors report 114 of 125 verification conditions discharged by Why3 auto level 3, equivalent to approximately 870 Coq proof-script lines (89.6%) (Sec. 3, p. 6). The remaining nine goals need induction, case analysis, assertions, or explicit existential witnesses.

## technique 1: expose induction as recursive lemma functions
What it is. Turn a universally quantified lemma into a recursive ghost/lemma function. Its `requires` clauses are induction premises, `ensures` is the conclusion, and a `variant` proves termination. Recursive calls then supply the induction hypothesis automatically.

How to do it.
1. Identify the recursive mathematical function in the postcondition; the paper uses `set_cont`, which recursively updates a finite map (Sec. 3, pp. 7–8)
2. Define a `let rec lemma` with universally quantified variables as parameters
3. Move premises into `requires`, the desired equality/property into `ensures`, and the decreasing induction argument into `variant { n }`
4. Mirror the recursive function’s argument updates in the lemma’s recursive call; Why3 then generates the induction hypothesis (Sec. 3, p. 8)

The paper’s concrete shape is a lemma with `requires { n ≥ 0 }`, `ensures { set_cont f ofs n i = f i }`, and `variant { n }`; it then calls itself with `n-1`, an updated map, and `ofs+1` (Sec. 3, pp. 7–8). It says: “Why3 is now able to automatically generate a valid induction hypothesis and prove the lemma.” (Sec. 3, p. 8)

Verus form (Inference: this paper is Why3, not Verus). Use a terminating `proof fn` with a decreasing integer argument and `requires`/`ensures`; call the proof function recursively to instantiate the induction hypothesis. Verus syntax differs from WhyML, so the exact `let rec lemma` form does not carry over. Keep the recursive mathematical function as a `spec fn` and prove its properties in a separate proof function.

## technique 2: assertions as solver-visible intermediate facts
What it is. Insert assertions in a lemma body to expose facts that are logically implied by the premises but not found automatically. Each assertion creates its own verification condition, making the dependency explicit.

How to do it. In `store_mapped_emb`, assert that `b1` is a valid pointer in `m1` and `b2` is valid in `m2` at offset `ofs+delta`; Why3 proves these assertions from the lemma premises and then uses them in the main postcondition (Sec. 3, p. 8). The paper states: “The assertions are introduced in the hypotheses of the lemma and Why3 generates two new VCs to prove both the assertions valid.” (Sec. 3, p. 8)

Verus form (Inference). Add `assert(...)` statements inside a proof function, or call a lemma that establishes the fact. The assertion must be proved from current facts; it is not an `external_body` escape. For executable Rust, keep the assertion ghost-only and preserve the same memory-state preconditions.

## technique 3: construct witnesses for existential goals
What it is. When automation cannot choose an existential witness, change the lemma to return the witness and strengthen its postcondition over that result.

How to do it.
1. Replace `exists m2'. P(m2')` with a lemma return value of the witness type `mem_`
2. Replace the existential postcondition with `ensures { P(result) }`
3. Construct the witness explicitly by updating the concrete memory record at the target block and offset (Sec. 3, pp. 8–9)
4. Let the solver prove the resulting conjunction; “The proof is now automatic and again, the technique is general.” (Sec. 3, p. 9)

Verus form (Inference). Make the proof function return the witness in ghost/spec form, then prove its `ensures`. Do not call a proof function at runtime; witness construction belongs in proof code or a `spec fn`.

## evidence and proof engineering
A semi-automatic Why3 version proves 115 of 124 listed lemmas automatically (92.7%); the denominator is 124 lemmas, and percentages in Table 3 are per module (Sec. 4, p. 10). The remaining interactive proof effort is about 117 transformations, versus 220 in Coq, a 46.8% reduction (Sec. 4, p. 11). A fully automatic version encodes the formerly interactive transformations as auxiliary results in WhyML, improving replayability (Sec. 6, p. 12).

Why3 also extracts an OCaml implementation of the concrete memory model. Undefined choices such as available memory and alignment are moved behind a parameterized module interface (Sec. 5, pp. 10–11). The executable is therefore correct relative to those supplied functions and the proved model.

## what remains trusted and what VL can reuse
The proof relies on the axiomatized memory model, Why3’s VC generation and SMT provers, and the correctness of code extraction. First-order expressiveness is a boundary: the authors write, “It is undoubtedly, at some point, limited to first order logic.” (Sec. 6, p. 12). The experiment compares against an older Coq script and is not evidence that every memory proof reaches 93% automation.

Inference: threat to agent-written verified Rust is low-to-moderate. The reusable lesson is proof-shape engineering: expose induction, intermediate facts, and witnesses as typed proof artifacts so automation can replay them. Verus already supports contracts, assertions, recursive proof functions, and solver-backed arithmetic, but its Rust ownership and SMT encoding differ from Why3; this paper does not establish Verus performance or soundness.

## techniques for the catalog
- recursive lemma induction: mirror a recursive spec function in a terminating proof function
- assertion exposure: state solver-relevant intermediate facts explicitly and prove each assertion
- witness-returning lemmas: return existential witnesses and specify their required properties
- proof refactoring for replay: replace opaque interactive tactics with named auxiliary facts
- model extraction: parameterize undefined implementation choices before extracting executable code

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
