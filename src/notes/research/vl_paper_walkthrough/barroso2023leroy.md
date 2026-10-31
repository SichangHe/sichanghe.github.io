# Leroy and Blazy Were Right: Their Memory Model Soundness Proof is Automatable
(authored by agents unless marked 🧑)
Tag: `barroso2023leroy`, [paper](https://arxiv.org/abs/2212.02425) (arXiv:2212.02425v1 as printed in the paper text; the Springer DOI in the earlier version of this line came from the fetch record and is not in the paper text)

## result
Barroso, Pereira, and Ravara translate Leroy and Blazy’s CompCert memory-model soundness development from Coq to Why3/WhyML, retaining a first-order axiomatization and adding an executable concrete model. The abstract reports that they “automated their formalization using Why3, significantly reducing the proof effort.” (abstract, p. 1). The target is proof automation for memory-model properties, not a new memory model.

The original Coq development had approximately 1070 lines of theorem/specification and 970 lines of proof script (Sec. 2.4, p. 6). The Why3 development has approximately 1040 lines of theorem/specification (Sec. 3, p. 6). The authors report 114 of 125 verification conditions discharged by Why3 auto level 3, equivalent to approximately 870 Coq proof-script lines (89.6%) (Sec. 3, p. 6). The remaining nine goals need induction, case analysis, assertions, or an existential witness (Sec. 3, p. 6; Table B1, p. 14). Inference: the paper is internally inconsistent on counts, since 125 minus 114 is 11, not 9, and Sec. 4 later says 115 of 124 lemmas were proved automatically in the semi-automatic version.

## technique 1: expose induction as recursive lemma functions
What it is. Turn a universally quantified lemma into a recursive ghost/lemma function. Its `requires` clauses are induction premises, `ensures` is the conclusion, and a `variant` proves termination. Recursive calls then supply the induction hypothesis automatically.

How to do it.
1. Identify the recursive mathematical function in the postcondition; the paper uses `set_cont`, which recursively updates a finite map (Sec. 3, pp. 7–8)
2. Define a `let rec lemma` with universally quantified variables as parameters
3. Move premises into `requires`, the desired equality/property into `ensures`, and the decreasing induction argument into `variant { n }`
4. Mirror the recursive function’s argument updates in the lemma’s recursive call; Why3 then generates the induction hypothesis (Sec. 3, p. 8)

The paper’s concrete shape is a lemma `set_cont_outside` with `requires { n ≥ 0 }`, `requires { i < ofs ∨ i ≥ ofs + n }`, `ensures { set_cont f ofs n i = f i }`, and `variant { n }`; the body is `if n > 0 then set_cont_outside (n-1) (update ofs None f) (ofs + 1) i` (Sec. 3, pp. 7–8). The paper says lemma functions are used because “any recursive call to the functions means an application of the induction hypothesis” (Sec. 3, p. 7). It says: “Why3 is now able to automatically generate a valid induction hypothesis and prove the lemma.” (Sec. 3, p. 8)

Verus form (Inference: this paper is Why3, not Verus). Use a terminating `proof fn` with a decreasing integer argument and `requires`/`ensures`; call the proof function recursively to instantiate the induction hypothesis. Verus syntax differs from WhyML, so the exact `let rec lemma` form does not carry over. Keep the recursive mathematical function as a `spec fn` and prove its properties in a separate proof function.

## technique 2: assertions as solver-visible intermediate facts
What it is. Insert assertions in the body of a `let lemma`. Each assertion creates its own verification condition. Inference: this exposes facts that the solver would not otherwise use or find; the paper says only that the techniques of Sec. 3 were needed to “aid the verification process” (Sec. 4, p. 9).

How to do it. In `store_mapped_emb`, assert that `b1` is a valid pointer in `m1` and `b2` is valid in `m2` at offset `ofs+delta`; The paper states: “The assertions are introduced in the hypotheses of the lemma and Why3 generates two new VCs to prove both the assertions are valid.” (Sec. 3, p. 8)

Verus form (Inference). Add `assert(...)` statements inside a proof function, or call a lemma that establishes the fact. The assertion must be proved from current facts; it is not an `external_body` escape. For executable Rust, keep the assertion ghost-only and preserve the same memory-state preconditions.

## technique 3: construct witnesses for existential goals
What it is. When automation cannot choose an existential witness, change the lemma to return the witness and strengthen its postcondition over that result.

How to do it.
1. Replace `exists m2'. P(m2')` with a lemma return value of the witness type `mem_`
2. Replace the existential postcondition with `ensures { P(result) }`
3. Construct the witness explicitly by updating the concrete memory record at the target block and offset (Sec. 3, pp. 8–9; the example lemma is `store_lessdef`)
4. Let the solver prove the resulting postcondition; “The proof is now automatic and again, the technique is general.” (Sec. 3, p. 9)

Verus form (Inference). Make the proof function return the witness in ghost/spec form, then prove its `ensures`. Do not call a proof function at runtime; witness construction belongs in proof code or a `spec fn`.

## evidence and proof engineering
A semi-automatic Why3 version, without interactions stated in the code, proves 115 of 124 lemmas automatically (92.7%, “circa 93%”); Table 3 gives per-module percentages plus this total (Sec. 4, p. 10). The remaining interactive proofs take 117 transformations versus 220 in Coq, a 46.8% reduction (Sec. 4, p. 10; Table C2, Appendix C, p. 14). Applying the three techniques to the nine remaining lemmas reduces the manually conducted transformations to 0 (Table 1, Sec. 3, p. 9). The paper’s caveat: it used the original Coq proof and notes that “nowadays Coq has much more support to automation” (Sec. 4, p. 9). A fully automatic version encodes the formerly interactive transformations as auxiliary results in WhyML; the paper says this improves readability and, since the proof is fully automatic, preserves proof sessions so they can be replayed (Sec. 6, p. 11).

Why3 also extracts an OCaml implementation of the concrete memory model. The original model uses undefined functions (e.g. `enough_free_memory`, `alignof`); these are placed in a parameterized module (a functor, `Make`), and after this manual change “the obtained OCaml code compiles” (Sec. 5, pp. 10–11). Inference: the executable is therefore correct only relative to whatever implementations of those functions are supplied.

## techniques for the catalog
- recursive lemma induction: mirror a recursive spec function in a terminating proof function
- assertion exposure: state solver-relevant intermediate facts explicitly and prove each assertion
- witness-returning lemmas: return existential witnesses and specify their required properties
- proof refactoring for replay: replace opaque interactive tactics with named auxiliary facts
- model extraction: parameterize undefined implementation choices before extracting executable code
