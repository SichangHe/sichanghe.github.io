# Proving at Scale for Universal Algebra
(authored by agents unless marked 🧑)
Tag: `araujo2026proving`, [paper](https://arxiv.org/abs/2610.02500)

## project and trust boundary
Araújo, Hůla, Janota, Lee, and Naskręcki describe SEMIBASE, a catalogue of finite identity bases for small semigroups. The abstract states: "LLM-guided agents search for these proofs; a referee agent rebuilds them from source, and the Lean kernel checks the resulting corpus in a final audit." (Abstract, p. 1.) The catalogue covers all 1,309 semigroups of order at most 5 and all 15,973 of order 6, including four certified nonfinitely based cases (Abstract, p. 1).

The workflow has workers, a coordinator, a referee, and humans. Workers propose bases, counter-models, and Lean proofs; the referee rebuilds from source; humans choose targets and approve repository changes (§3, p. 3). The key trust claim is kernel checking, not an LLM's verdict: "Our referee agent is therefore not trusted to verify: it triages work and settles disputes, but a class is accepted only when the Lean kernel re-checks its proof in the whole-corpus audit." (§1, p. 2.)

Inference: this separation maps directly to VL. An agent may search and draft Verus proofs, but acceptance should rebuild the source and run the verifier over the complete dependency set. The agent's review message is evidence about process, not a trusted proof.

## technique 1: counter-model screening before formal proof
what it is and when to use it
A candidate identity basis is first tested against finite counter-models. A semigroup satisfying the candidate but violating a target identity refutes the candidate before expensive Lean work. The paper says: "A candidate basis is first screened for counter-models: a semigroup that satisfies the candidate but not some identity of the target refutes it." (§3, p. 3.) Inference: use this when candidate specifications are cheap to falsify on small models and formal proof construction is costly.

steps
1. Generate or import a finite candidate basis (§3, p. 3)
2. Search for a semigroup satisfying the candidate but violating an identity of the target (§3, p. 3)
3. Discard a candidate refuted by such a counter-model (§3, p. 3)
4. Only then encode the surviving candidate as Lean theorems (§3, p. 3)

The project reports 76 candidates refuted before any Lean was written, from 8 August to 6 September (§3, p. 3). One candidate with nine identities was refuted by an order-20 semigroup that satisfied all nine but not `xykxty ≈ xxkxtyyx` (§3, p. 4). The authors note that this counter-model was "larger than any the screens examine" (§3, p. 4).

Verus form (inference)
Inference: encode a candidate contract as a `spec fn` over a finite model and write a proof function that exhibits a counterexample when the contract fails. Use this as a pre-proof filter; do not treat a finite search as completeness. Verus can prove the counterexample arithmetic if the model is explicit, but it cannot establish that no larger counter-model exists without a separate theorem.

## technique 2: shared family proofs and normal forms
The successful completeness proofs fix a normal form for words, derive rewriting rules from the basis, show every word rewrites to that form, and show the normal form is determined by finite features visible in the table. The authors write: "The proofs that succeeded all have the same shape." (§3, p. 3.) Features include first and last occurrence order and letter parity (§3, p. 3).

steps
1. choose a normal form for all words (§3, p. 3)
2. derive rewrite rules from candidate identities (§3, p. 3)
3. prove every word rewrites to its normal form (§3, p. 3)
4. prove the finite table features determine that normal form (§3, p. 3)
5. instantiate the shared proof for each multiplication table in the family (§3, p. 3)

Sharing one basis across families and counter-model search saved the most work (§3, p. 4). Among the 15,973 order-6 classes, 15,524 were sealed by family proofs, 445 had generated proofs of their own, and four had proofs that no finite basis exists (§4–4.2, p. 4). Family proof files had median 170 Lean lines and maximum 9,568 (Appendix B, Table 2, p. 9).

Verus form (inference)
Inference: represent a normal form as a recursive `spec fn`, prove rewrite preservation with `proof fn` lemmas, and state a terminating measure for word reduction. A family theorem can quantify over a finite table parameter, while each concrete table supplies executable facts. Verus syntax and automation differ from Lean, so the exact identity library must be reimplemented; the reusable idea is abstraction over a shared invariant.

## technique 3: whole-corpus clean rebuild and kernel audit
A class is sealed only after an independent rebuild checks its proof with the full corpus, verifies that the theorem's table is the catalogue table, checks the axioms, and records theorem names and file hashes (§3, p. 3). Appendix B describes audit modules that list covered semigroups, final theorems, axioms, and failed identities (p. 8).

steps
1. rebuild a submitted proof from source in a clean environment (§3, p. 3)
2. assemble the whole corpus and its audit modules (Appendix A, p. 8)
3. check every table and theorem against catalogue data (Appendix B, p. 8)
4. inspect the axioms used and record hashes and theorem names in a certificate (§3, p. 3)
5. accept the class only when the Lean kernel checks the complete build (§1, p. 2)

The final audit sealed 15,973 of 15,973 classes (Fig. 3, p. 8). The acceptance repository had 9,329 files and 6.94 million lines, using Lean 4.28 without Mathlib; only `propext`, `Classical.choice`, and `Quot.sound` were listed standard axioms (Fig. 3, p. 8).

Verus form (inference)
Inference: run `verus` on a clean checkout, include all modules and generated certificates, and preserve the verifier version and dependency hashes. Use `assert` and `ensures` to tie a catalogue row to its exact table. Verus can check the source-level contracts, but external libraries, compiler correctness, and the catalogue's semantic adequacy remain trusted assumptions.

## technique 4: transfer proofs and generated certificates
A common transfer starts from a previously certified semigroup S with basis B. If S embeds in a direct power of target T, or is a quotient of a subsemigroup of T, every identity of T holds in S and thus follows from B. Checking that T satisfies B then proves that B is a basis for T. Other proofs combine factor bases for a subdirect product, adapt a basis through an inflation, or enumerate identities of a nilpotent semigroup (§4.1, p. 4). Every proof module establishes that the candidate identities hold on the table and that every table identity follows from them (Appendix B, p. 8).

The certificate size has a heavy tail: among 445 generated proofs, median 334 lines, mean 7,227, p99 126,350, maximum 333,557; nine exceed 100,000 lines (§4.1; Appendix B, p. 9). The largest proof took more than a day on one core (Appendix B, p. 9). Inference: verification throughput must budget for long-tail proof costs rather than average proof size.

## measurements, gaps, and product threat
The 536 certified bases define 505 distinct varieties. For the 143,380 basis pairs, a semigroup in the order-6 catalogue separates all but 31; Vampire proves those 31 pairs equivalent. Vampire proofs and their transitive consequences give 13,321 inclusions, with 1,320 covering pairs and 87 maximal varieties; four inclusions remained unresolved after 12 hours each (§4.2, pp. 4–5). These Vampire results were not checked in Lean; they rest on Vampire proofs and table counter-models (§4.2, p. 5). Inference: the derived ordering has a different verification basis from the Lean-checked catalogue.

The campaign ran for 90 days and used about 2,260 Codex agent sessions; Lean builds on the WMI cluster used about 1,500 core-hours (Appendix C, Table 3, p. 10). Order 7 has 836,021 semigroups and is the next target (§5, p. 5). Humans wrote no proofs, but supplied 440 prompts to Codex agents and 674 to the referee, chose targets, approved pushes, and restarted agents (§3, p. 3). Inference: for VL, accepting review messages or generated metadata without verifier execution would leave proof validity unestablished. Counter-model screening, shared proofs, and whole-project rebuilds are reusable ideas; this paper does not test them in Verus.

## techniques for the catalog
- counter-model screening: refute candidate specifications on finite models before writing expensive proofs
- family normal forms: share a rewrite and finite-feature proof across instances with the same basis
- whole-corpus audit: rebuild every theorem and table from source and let the kernel decide acceptance
- transfer certificates: derive new-instance proofs from embeddings, quotients, products, or earlier certified cases
- verifier boundary accounting: distinguish kernel-checked results from Vampire-derived or externally trusted computations

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Each family keeps its own lemma files next to the proofs of its members, and each module imports only what it needs."): checked every quotation, number, section and page reference, and technique step against the full paper; corrected the paper link, screening steps, page references, class accounting, transfer explanation, and attribution of basis separation; marked application advice and trust comparisons as inferences; did not independently rebuild Lean proofs, rerun Vampire, or test the Verus proposals.
