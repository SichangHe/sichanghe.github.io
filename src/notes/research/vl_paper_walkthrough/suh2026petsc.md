# Verification of PETSc with CIVL using LLM-generated ACSL contracts and deterministic driver generation
(authored by agents unless marked 🧑)
Tag: `suh2026petsc`, [paper](https://doi.org/10.48550/arxiv.2609.31687)
## scope and contribution

This paper verifies three PETSc matrix operations by separating stochastic specification from deterministic harness construction. Its pipeline is “LLM → manual review → deterministic compiler” (§I, p.2). The LLM sees documentation, a C prototype, and a restricted ACSL profile; a PETSc expert certifies the candidate; `acsl2civl` emits CIVL drivers; CIVL symbolically explores bounded executions. The paper reports a previously undiscovered MatAYPX aliasing bug present since 1997 (abstract, p.1).

The design responds to an auditability problem. The authors write: “an unaudited driver that passes verification is worse than no driver at all, as it results in misplaced confidence in the underlying code.” (§I, p.2) They therefore make the LLM generate only a short contract, not a complete driver.

## technique: restricted contract synthesis with human certification

What it is: constrain the model to a small ACSL fragment (`requires`, `assigns`, `ensures`, named behaviors, `\old`, quantifiers, arithmetic and conditionals) plus PETSc predicates such as `valid_mat`, `assembled`, `same_comm`, and `separated_mat` (Table I, §II-A, pp.3–4). Objects are represented by dense row-major global images, hiding distributed storage. Reductions such as sums, norms and dot products are unsupported (§II-A).

When to use it: use this when documentation states an API’s mathematical behavior but the executable verification harness requires specialist MPI and object-model code. It is especially useful where a full LLM driver would mix symbolic input construction, aliasing cases, reference models and assertions.

How to apply it:

1. Build a self-contained prompt containing the current profile, output skeleton, function prototype and manual page (§II-B, p.4)
2. Exclude the source repository from the prompt; the model should derive behavior from documentation (§II-B)
3. Ask the model for a candidate contract in the fixed profile; archive prompt and raw output (§II-B)
4. Have a PETSc-aware reviewer compare every clause with documentation, API semantics and, where needed, implementation; record unresolved documentation decisions (§II-C, p.5)
5. Reject and regenerate when unsupported or incorrect; certify only a reviewed contract (§II-C)
6. Parse the certified contract; derive cases and deterministic CIVL drivers, or reject unsupported constructs (§II-D, p.5)
7. Run CIVL against the CIVL-compatible PETSc port, checking contract assertions and a separate reference model when one exists (§II-D)

Verus form (Inference: this paper is C/ACSL/CIVL): generate a small `spec fn` or `ensures` contract for a Rust API, have a human review aliasing and frame assumptions, then write a deterministic proof harness using `requires`, `ensures`, `assert`, and `proof fn`. Verus has no ACSL `assigns`; frame properties must be expressed in postconditions over snapshots or ownership. Verus does not provide CIVL’s MPI state exploration automatically, so distributed behavior needs a Verus state-machine/model API. Keep the generated contract untrusted until Verus verifies the implementation.

Evidence: MatAXPY had a 14-line certified contract and a 176-line generated-driver set; MatAYPX 13 and 152; MatFilter 8 and 38 (Table IV, p.7). The authors stress that counts exclude comments and do not measure review time. Small experiments exhaustively explored process counts 1 and 2 and dimensions M,N from 1 to 3, under the specified CIVL model (§III, p.6). Table III reports MatAXPY distinct cases at 36.73 s, 2.27 GiB, 102,082 states and 206,215 transitions (D), and 34.36 s, 2.27 GiB, 102,082 states and 206,215 transitions (U). These denominators are cases, not random tests.

Failure and assumptions: the dense image abstracts storage and communication; unsupported sparse semantics and assembly machinery remain outside the claim (§IV, p.9). The profile must evolve when a recurring contract pattern appears. Human certification is essential: the model can invent undocumented restrictions. The authors state, “Only a certified contract proceeds.” (§II, p.3)

## technique: deterministic case derivation and frame checking

`acsl2civl` translates `requires` into symbolic-input constraints, custom predicates into assumptions or generated cases, `assigns` into pre-call snapshots and frame checks, and `ensures` into elementwise assertions over the gathered image (Table II, p.5). For MatAXPY, removing an LLM-generated `separated_mat(X,Y)` allows four drivers: distinct/aliased × different/unknown nonzero-pattern hints (§III-A, pp.6–7). The generated distinct driver calls a reference model, calls the ported implementation, compares the whole image, checks X’s frame, and checks certified postconditions (Listing 3, p.7).

Use this when aliasing or enum parameters create a finite cross-product of behaviors. Steps are: identify profile dimensions; add deterministic derivation rules; generate one driver per admitted combination; snapshot locations from `assigns`; run CIVL assertions for postcondition and unchanged locations. In Verus (Inference), use owned or borrowed values to make distinctness explicit, and write separate proof lemmas for aliasing branches; snapshots use `old(...)` in specifications where supported by the Verus form, rather than ACSL syntax. The paper’s approach does not establish that all Rust aliasing is covered.

Evidence is the driver-size reduction above. The paper also shows why symbolic values alone miss pointer identity: two separately allocated matrices may have equal values but never satisfy `Y == X`; only a same-handle driver exercises the branch (§III-A, p.7).

## technique: contract-only oracle and bug discovery

MatAYPX has no reference model, so the human-certified contract is the sole oracle (§III-C, p.8). The contract intentionally leaves aliasing unrestricted because documentation does not require X and Y to differ. The implementation scales Y and then calls MatAXPY; when X=Y this produces `2aYold` rather than `(1+a)Yold`. CIVL reports a provable assertion violation in aliased rows of Table III: 1,615 states and 3,460 transitions, 6.75 s (D) and 7.06 s (U). The paper’s exact conclusion is: “Because MatAYPX documents no aliasing restriction, its inconsistent aliased result is a bug, not a reason to weaken the contract with requires Y != X.” (§III-C, p.8)

In Verus (Inference), this corresponds to writing a postcondition that quantifies over the aliased state and proving the implementation; a counterexample means implementation repair, contract revision only if the documentation is wrong. The oracle remains a specification, so a wrong human contract can produce a sound proof of the wrong behavior.

## technique: profile evolution for conditional operations

For non-compressing MatFilter, the initial profile could not express a symbolic tolerance or conditional postcondition. The authors identify unsupported semantics, extend the profile with symbolic `PetscReal`, ordered comparisons, `\abs`, and conditional expressions, update the parser and compiler, and then regenerate drivers (Figure 2, §III-D, p.9). This staged extension keeps new compiler behavior deterministic and reviewable.

Inference: in Verus, add a reusable spec-level conditional expression and a proof lemma for each branch, then retain the profile change as a versioned library rule. Do not use `external_body` on the function under verification; any external model must be a separately trusted abstraction.

## what is proved, trusted, and relevant to VL

CIVL proves the ported implementation satisfies the certified contract for bounded symbolic inputs and process counts, and compares MatAXPY to a separately authored reference model. It does not prove unbounded MPI executions, unsupported sparse/assembly behavior, the correctness of the dense abstraction, the PETSc documentation, human certification, the CIVL port, CIVL/Z3/CVC4, or the compiler. The paper measures states and transitions under a laptop setup (CIVL 2.0, Z3 4.8.12, CVC4 1.8; Table III footnote), not general scalability.

Inference: threat to agent-written verified Rust is high for specification errors and moderate for harness errors. The three-stage split is directly useful to VL: let an agent draft a small contract, require human or policy review for assumptions, and generate deterministic proof harnesses. Existing work already demonstrates this pattern and a real bug; VL should not redo it without a Rust-specific aliasing, ownership or dependency experiment. MatAYPX also shows that a contract-only oracle can find bugs, but only when the contract’s documented semantics are complete.

## techniques for the catalog

- restricted contract generation — constrain an LLM to a small ACSL/PETSc profile derived from documentation
- human contract certification — inspect model clauses against docs, API and implementation before acceptance
- deterministic driver compilation — translate certified contracts into finite CIVL cases and assertions
- aliasing-case derivation — generate same-handle and distinct-handle drivers from profile rules
- contract-only oracle checking — use a certified postcondition when no reference model exists
- profile evolution — extend parser and compiler when unsupported recurring semantics are identified
Checked 2026-10-13: audit record suh2026petsc; paper-study comparison complete; gate executed; experiments not rerun
