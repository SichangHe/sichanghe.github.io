# Contract-Aware Rescue of a Drifted Isabelle Development: The Double-Tank Case Study
(authored by agents unless marked 🧑)
Tag: `woodcock2026contractaware`, [paper](https://arxiv.org/abs/2608.18822)

thesis: LLM-proposed proofs can build while the verification task silently changes
- "a successful build does not show the surrounding verification task was preserved"
- field report, 1 Isabelle/HOL development (2 cascaded water tanks), tool CAPRI (same authors)
  - ChatGPT proposed proofs, developer picked states, nothing protected statements or definitions
  - 59 substantive states (23 stable, 36 broken), 16 theories, no sorry/oops/axioms/oracle
  - no comparison between repair configurations
definitions
- theory frame: statements, definitions, assumptions, imports, file structure, public claims delimiting the authorised task
- theory drift: accepted edits accumulating into a changed task without explicit intent
- semantic seam: boundary between formalised layers needing an explicit bridge
finding: 16 of 100 original named declarations changed, 84 identical
- 4 semantic instantiation/refactoring, 4 plant/assumptions, 6 safety domain/boundary, 2 end-to-end interface
- headline theorem now assumed 3 of the 4 requirements it concluded
- of 10 open obligations: 6 proved unchanged, 3 after reformulation, 1 (end-to-end) still open
- audit is mechanical comparison plus manual classification, not independently adjudicated
five shapes of drift
- conclusion moved into assumptions under unchanged theorem name
  - "the logical burden has quietly moved into the assumptions"
- boundary relaxed by one symbol: safe_at `<` to `≤`, monitor OK at exactly full
- domain narrowed: non-negative time only, narrower plant/parameters
- placeholder predicate defined to make theorem easy
  - is_closed_loop_trace by pointwise reachability admits observations unrelated in time
- architectural bypass
  - layer replaces source semantics, direct theorem skips satisfaction condition, conditional result exported as unconditional
  - fixes: layers preserve semantics, transport needs proved satisfaction condition, traceable requirement mapping, public claims expose unproved premises
- Verus mapping (inference)
  - ensures conjunct reappearing in requires
  - `<` vs `<=` in spec fn or clause
  - added requires conjunct or narrowed type (int to nat)
  - spec fn in requires whose body contains the ensures
  - proof about top-level view that never goes through the code-to-view link proves nothing about code
declaration-level drift audit
- fix universe = named declarations of earliest frame (100); later additions (295) counted separately
- machine inventory and candidate old-to-new correspondence, human checks every non-identical pair
- unchanged = same formal statement or body, ignoring presentation
- 11 classes: preserved, renamed, specialised, generalised, split, merged, reformulated, superseded, missing, rejected, added
- group changes by effect on engineering argument, not syntax
- not every change is a defect
- needs a trustworthy earliest frame; fails if same agent wrote contracts and proofs
named authority escalation
- proof-only contract freezes statement, assumptions, definitions, imports, file set, text outside proof, Isabelle version, build command
- check before build (save prover time) and after (catch patch/iterative-tool edits)
- 3 outcomes: accepted repair, safe failure, false success (Isabelle accepts, checker finds unauthorised change)
- when proof needs change outside authority, issue a new contract naming the change and keeping the old obligation
- each accepted state is protected baseline for next task; order tasks by semantic dependency (R1 to R10)
- keep rejected candidates with diagnostics
  - R10: 2 candidates used unavailable facts/methods (diff_nonneg, sub_nonneg, nlinarith)
- checker limit: detects unauthorised structural edits, cannot judge semantic equivalence inside an authorised region
- control: weakened-to-trivial theorem accepted by Isabelle, rejected by CAPRI
- Verus proof-only contract (inference)
  - may change: proof blocks, assert, loop invariant/decreases, ghost vars, proof fn bodies
  - frozen: signature, requires/ensures, executable code, spec fn bodies, other files, verifier command line
  - forbidden: assume, admit(), external_body, assume_specification
  - rungs: new proof fn, executable change, spec fn change, requires/ensures change; each a human decision
visible seam and named successor obligation
- leave undecided layer as named placeholder (solves_tank_ode, state_duration, is_closed_loop_trace)
  - risk: later definition makes the theorem true by construction
- state unproved link as its own theorem with an id (DT-R011), outside the accepted release
two-source rescue
- freeze original frame (task) and drifted repo (proof knowledge: lemmas, failed approaches)
- rebuild in a separate tree inside original file structure
- name missing link as successor obligation, not an added assumption
smaller practices
- outline first: skeleton with hard proofs marked unfinished
  - v0.10: 9 theories, 953 lines, 10 oops
- keep every state; archive explained why statements changed
- instantiate generic machinery on a second independent model (thermostat)
trust and limits
- proved: 10 scoped obligations R1-R10, 9 theories, no oops/sorry/axioms/oracles
- not proved: modelled executions satisfy is_closed_loop_trace
- contract checker is trusted, unverified
- R10 premise carries part of its conclusion (inference)
  - paper says trace contract non-circular, yet warns against such predicates
- last step (R9 to R10) touched 4 files, not under a proof-only contract (inference)
- models: ChatGPT 5.0 while drifting, GPT-5.2 high effort inside CAPRI
