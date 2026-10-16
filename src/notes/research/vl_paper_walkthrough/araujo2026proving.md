# Proving at Scale for Universal Algebra
(authored by agents unless marked 🧑)
Tag: `araujo2026proving`, [paper](https://www.semanticscholar.org/paper/2bcef24684d326e29928eac570478aead2d476db)

## project and trust boundary
Araújo, Hůla, Janota, Lee, and Naskręcki describe SEMIBASE, a catalogue of finite identity bases for small semigroups. The abstract states: "LLM-guided agents search for these proofs; a referee agent rebuilds them from source, and the Lean kernel checks the resulting corpus in a final audit." (Abstract, p. 1.) The catalogue covers all 1,309 semigroups of order at most 5 and all 15,973 of order 6, including four certified nonfinitely based cases (Abstract, p. 1).

The workflow has workers, a coordinator, a referee, and humans. Workers propose bases, counter-models, and Lean proofs; the referee rebuilds from source; humans choose targets and approve repository changes (§3, p. 3). The key trust claim is kernel checking, not an LLM's verdict: "Our referee agent is therefore not trusted to verify: it triages work and settles disputes, but a class is accepted only when the Lean kernel re-checks its proof in the whole-corpus audit." (§1, p. 2.)

Inference: this separation maps directly to VL. An agent may search and draft Verus proofs, but acceptance should rebuild the source and run the verifier over the complete dependency set. The agent's review message is evidence about process, not a trusted proof.

## technique 1: counter-model screening before formal proof
what it is and when to use it
A candidate identity basis is first tested against finite counter-models. A semigroup satisfying the candidate but violating a target identity refutes the candidate before expensive Lean work. The paper says: "A candidate basis is first screened for counter-models: a semigroup that satisfies the candidate but not some identity of the target refutes it." (§3, p. 3.) Use this when candidate specifications are cheap to falsify on small models and formal proof construction is costly.

steps
1. Generate or import a finite candidate basis (§3, p. 3)
2. Enumerate screening semigroups and check whether each satisfies the candidate identities (§3, p. 3)
3. Search for a target identity that the screen semigroup violates; discard the candidate if found (§3, p. 3)
4. Only then encode the surviving candidate as Lean theorems (§3, p. 3)

The project reports 76 candidates refuted before any Lean was written, from 8 August to 6 September (§3, p. 3). One candidate with nine identities was refuted by an order-20 semigroup that satisfied all nine but not `xykxty ≈ xxkxtyyx` (§3, p. 3).

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

Sharing one basis across families and counter-model search saved the most work (§3, p. 4). Of 15,973 order-6 classes, 15,524 were sealed by family proofs; 445 required generated proofs (§4.1, p. 4). Family proof files had median 170 Lean lines and none exceeded 10,000 (§4.1, p. 4).

Verus form (inference)
Inference: represent a normal form as a recursive `spec fn`, prove rewrite preservation with `proof fn` lemmas, and state a terminating measure for word reduction. A family theorem can quantify over a finite table parameter, while each concrete table supplies executable facts. Verus syntax and automation differ from Lean, so the exact identity library must be reimplemented; the reusable idea is abstraction over a shared invariant.

## technique 3: whole-corpus clean rebuild and kernel audit
A class is sealed only after an independent rebuild checks its proof with the full corpus, verifies that the theorem's table is the catalogue table, checks the axioms, and records theorem names and file hashes (§3, p. 3). Appendix B describes audit modules that list covered semigroups, final theorems, axioms, and failed identities (p. 8).

steps
1. rebuild a submitted proof from source in a clean environment (§3, p. 3)
2. assemble the whole corpus and its audit modules (Appendix A, p. 7)
3. check every table and theorem against catalogue data (Appendix B, p. 8)
4. inspect the axioms used and record hashes and theorem names in a certificate (§3, p. 3)
5. accept the class only when the Lean kernel checks the complete build (§1, p. 2)

The final audit sealed 15,973 of 15,973 classes (Fig. 3, p. 8). The acceptance repository had 9,329 files and 6.94 million lines, using Lean 4.28 without Mathlib; only `propext`, `Classical.choice`, and `Quot.sound` were listed standard axioms (Fig. 3, p. 8).

Verus form (inference)
Inference: run `verus` on a clean checkout, include all modules and generated certificates, and preserve the verifier version and dependency hashes. Use `assert` and `ensures` to tie a catalogue row to its exact table. Verus can check the source-level contracts, but external libraries, compiler correctness, and the catalogue's semantic adequacy remain trusted assumptions.

## technique 4: transfer proofs and generated certificates
For many remaining semigroups, the project transfers a known basis through embeddings, quotients, subdirect products, inflations, or nilpotent enumeration (§4.1, p. 4). Generated modules prove each candidate identity on the table and that every table identity follows from the candidates (Appendix B, p. 8). This trades readable mathematics for mechanically generated certificates.

The certificate size has a heavy tail: among 445 generated proofs, median 334 lines, mean 7,227, p99 126,350, maximum 333,557; nine exceed 100,000 lines (§4.1; Appendix B, p. 9). The largest proof took more than a day on one core (Appendix B, p. 9). Inference: verification throughput must budget for long-tail proof costs rather than average proof size.

## measurements, gaps, and product threat
The catalogue's 505 distinct varieties came from 143,380 basis pairs; Vampire separated all but 31, and proved those 31 equivalent. It found 13,321 inclusions, with 1,320 covering pairs and 87 maximal varieties; four inclusions remained unresolved after 12 hours each (§4.2, p. 5). These Vampire results were not checked in Lean; they rest on Vampire proofs and table counter-models (§4.2, p. 5). This is a clear trust boundary: the Lean catalogue is stronger than the derived ordering.

The campaign took three months, about 2,260 agent sessions, and 1,500 core-hours of Lean builds; order 7 has 836,021 semigroups and is the next target (§5, p. 5). Humans wrote no proofs, but supplied about 1,100 prompts and chose targets/restarts (§1, p. 2; §3, p. 3). Inference: threat to a product of agent-written verified Rust is high if review agents or generated metadata are accepted without clean rebuilds; it is reduced by independent verifier execution, source hashes, and whole-project audits. VL should reuse the counter-model-first, shared-proof, and clean-audit pattern rather than redo a generic claim that LLM-generated proofs are trustworthy by inspection.

## techniques for the catalog
- counter-model screening: refute candidate specifications on finite models before writing expensive proofs
- family normal forms: share a rewrite and finite-feature proof across instances with the same basis
- whole-corpus audit: rebuild every theorem and table from source and let the kernel decide acceptance
- transfer certificates: derive new-instance proofs from embeddings, quotients, products, or earlier certified cases
- verifier boundary accounting: distinguish kernel-checked results from Vampire-derived or externally trusted computations

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
