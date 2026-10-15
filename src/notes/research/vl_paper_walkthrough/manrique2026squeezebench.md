# SqueezeBench: Saturation-Resilient Evaluation of Mathematical Capability
(authored by agents unless marked 🧑)
Tag: `manrique2026squeezebench`, [paper](http://arxiv.org/abs/2610.13461v1)

## scope and central idea

SqueezeBench is a Lean 4 benchmark for mathematical progress on open extremal-combinatorics problems. Instead of deleting a problem after one proof, it maintains lower and upper records: computable functions with machine-checked proofs that bound an unknown function f(n). A submission must prove that its replacement remains valid, never regresses against the incumbent, and improves at one witness input. The benchmark is directly relevant to formal verification because it evaluates agent-generated definitions and proofs through a mechanically enforced admission pipeline.

The abstract states: “A record is a computable Lean function with a machine-checked proof that it bounds f .” It also states: “A submission proposes a new function and proves that it bounds f , that it is no worse than the current record at any n, and that it is strictly better at some n.” (Abstract, p. 1.) Inference: this turns proof generation into an incumbent-preserving maintenance task, a useful model for VL libraries where verified APIs evolve over time.

## technique 1: two-sided function records

What it is. Each problem defines an integer function f:N→N whose exact values are known only for small n. The benchmark stores a lower record l with l(n)≤f(n) and an upper record u with f(n)≤u(n). The gap u(n)−l(n) measures unresolved knowledge at each n. A lower replacement l′ must prove three theorems: valid (l′≤f), improves (l≤l′), and strict (l(n0)<l′(n0)) for some witness n0; upper records reverse the inequalities (Section 2, pp. 3–4).

How to apply it. (1) Define f formally in Lean, usually as a finite maximum or minimum. (2) Publish an elementary seed lower and upper function. (3) For each candidate, write a computable Lean function and proofs of valid, improves, and strict. (4) Evaluate strict at a witness parameter. (5) Replace the record only after all checks pass. The paper’s running Golomb-ruler definition uses `IsSidon`, `RulerLengths`, and a noncomputable infimum for f (Section 4.2, p. 8); records may not compute f under another name.

Verus form. Inference: model a VL library invariant as a record contract R(n), with a replacement requiring a proof of validity, refinement/non-regression, and strict improvement on a test input. Verus can express the obligations with `requires`, `ensures`, executable functions, and proof functions; unlike Lean’s shown `sInf`, the exact encoding depends on the Rust data type and finite model. The monotonicity obligation should quantify over the supported domain, not merely test examples.

Evidence. The benchmark contains ten problems and twenty initial records. The paper reports that frontier-model agents had 82 submissions accepted and improved every record; newer agents had 60 more accepted and improved 19 of 20 records (Abstract and Section 5, pp. 1, 9). These counts are accepted submissions across 20 tracks, not theorem-proving success percentages.

Limits. The benchmark covers one-parameter integer functions from extremal combinatorics; the authors state that “The benchmark has limits. Its ten problems come from one area of mathematics and have one parameter each.” (Section 6, p. 10.) Inference: this is a design pattern for regression-safe verification, not evidence that all product changes can be ordered by a scalar record.

## technique 2: challenge/solution separation and two kernels

What it is. A trusted Challenge file fixes the statements while leaving the new definition and proof obligations open. An untrusted submission supplies `Def.lean`, `Proof.lean`, metadata, and a report. Comparator checks that the solution proves exactly the challenge statements and uses only allowed axioms. The split keeps the definition that future challenges import separate from proof scripts. The paper explains: “The split matters because the next Challenge imports Def.lean to refer to this record, which makes that file trusted; keeping the proofs out of it keeps the trusted part small.” (Section 2, p. 5.)

How to apply it. (1) Generate a challenge from the current trusted record. (2) Let the submitter fill only the open definition and theorem proofs. (3) Run Comparator with an explicit axiom allow-list. (4) Check the proof with Lean’s kernel and an independent kernel implementation, nanoda. (5) Import only the accepted definition into the next challenge. The paper allows only `propext`, `Quot.sound`, and `Classical.choice`; `sorry` and `native_decide` are rejected (Section 2, p. 5).

Verus form. Inference: separate a trusted specification and prior verified API from agent-submitted implementation/proof files, then run Verus and an independent replay or checker over the fixed obligations. Verus does not use Lean’s `Comparator` or nanoda, so an equivalent independent checker would need to be engineered; the paper’s trust reduction comes from fixing statements and independently rechecking them, not from any particular file extension.

Evidence and trust. Every proof is checked by two independent Lean kernels, while the challenge statements and the comparator configuration are trusted. The paper’s abstract says: “Every proof is checked by two independent Lean kernels, so no referee needs to check the mathematics.” The maintainer still checks that each formal definition matches the intended question once per problem and reads reports for prohibited search above n=100 (Sections 2 and 6, pp. 4, 10). Thus the pipeline reduces but does not eliminate human trust.

## technique 3: anti-exhaustive-search admission gates

What it is. A computable record could trivially calculate f by exhaustive search at small inputs and become impossible to improve. SqueezeBench evaluates each submitted record for every n≤100 under a fixed computation budget, rejecting such a search below 100; a maintainer inspects the report for search moved above that range. Gate 6 also requires each evaluation to be cheap. The abstract summarizes: “The checks also reject a function that computes f by exhaustive search at small n, and a maintainer only reads the submitter’s report and looks for such a search at larger n.” (Abstract, p. 1.)

How to apply it. (1) Bound the evaluator’s input range and heartbeat/time budget. (2) Execute the candidate function at every n in the range. (3) Reject non-computable, too-slow, or hidden exhaustive-search definitions. (4) Require a report describing how the bound was found. (5) Have a maintainer inspect larger-n search claims. (6) Re-run the full audit on merged records.

Verus form. Inference: for VL, add bounded execution and resource checks for candidate verified functions, but keep these separate from semantic proof obligations. A Verus proof that a function is correct does not show that its runtime is acceptable or that it avoids hidden enumeration; a product gate must measure execution and inspect dependencies.

Evidence. In evaluation, one Ellenberg–Gijswijt formalization exceeded the budget from n=59 to 100 and was resubmitted with fewer than 100 heartbeats per n (Section 5, p. 9). One record passed earlier checks but was rejected after Gate 6 was added. These are concrete admissions failures, showing that resource checks changed outcomes.

## technique 4: agent loop with records as persistent state

The paper runs one agent per problem-direction track. Agents read current documentation and records, choose a bound, develop Lean proofs for valid/improves/strict, run `squeeze verify`, accept a passing bound, and repeat. The first phase used Opus 5 agents for at most one hour per record; the second continued from those records with Fable 5.1 and Opus 5.5 for up to about two hours. The authors state: “In both phases, one agent was used per track (10 problems × 2 directions).” (Section 5, p. 9.)

Evidence. All 20 records improved on their seeds. The first phase accepted 82 submissions in 18.9 hours; the second accepted 60 more and improved 19 of 20 records. The Golomb-ruler record gap fell from 49 at n=28 and 621 at n=100 after the runs, with 13 upper and 8 lower versions accepted (Section 5, p. 10). These denominators and starting snapshots define the result; the second phase was explicitly not a controlled model comparison.

Inference: A VL deployment could treat a verified library revision as the incumbent, require each agent change to prove preservation and improvement obligations, and retain a history of accepted versions. This would make regression and proof-maintenance work measurable, but the paper does not test Rust, concurrency, unsafe code, or dependency upgrades.

## what is proved, trusted, and left open

The Lean kernels check the submitted theorem proofs; Comparator fixes statements and rejects disallowed axioms; bounded computation checks executability and cost. The formal definitions, Mathlib, kernel implementations, checker, compiler, machine model, and maintainer’s interpretation remain trusted. Inference: the principal threat to agent-written verified Rust is specification drift or a trusted dependency whose contract no longer matches its implementation; SqueezeBench’s fixed challenge and non-regression pattern addresses evolution but not that entire trust boundary.

The authors report that nearly all accepted proofs use general arguments and explicit constructions, and that none of the runs went beyond the published literature except a possible concrete Ruzsa–Szemerédi value (Section 5, pp. 9–10). They also note that exhaustive-search impossibility results cannot enter without a short certificate. Existing VL work should not redo a solved-problem benchmark with a fixed target; the transferable contribution is a mechanically checked, incumbent-beating record protocol with explicit resource and trust gates.

## techniques for the catalog

- two-sided function records: keep lower and upper computable bounds and accept replacements only with validity, non-regression, and strict-improvement proofs
- challenge/solution isolation: fix theorem statements in a trusted challenge and independently check untrusted definitions and proofs with an explicit axiom list
- anti-search admission gates: evaluate candidates over a bounded range and budget, reject hidden exhaustive search, and audit reports for larger-n search
- persistent agent records: use accepted verified versions as the next agent’s state and measure progress by record history rather than solved-problem count

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
