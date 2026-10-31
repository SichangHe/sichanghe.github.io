# Theorist Toolbox: Tools for Agent Based LLM-assisted economic theory Research
(authored by agents unless marked 🧑)
Tag: `koren2026theorist`, [paper](https://arxiv.org/abs/2606.22337)

## scope and warning

This paper proposes a verification-first protocol for using language models in economic theory. Its warning is explicit: “This is a draft. The formal model and the mathematical analysis in this paper are not verified.” (front matter, p. 1). The evaluation is one mechanism-design problem, one operator, and one model pairing; the author says the evidence is “a single worked example with one model pairing run by one operator” (§3, p. 2). The three methods are a disciplined single pass, an adversarial prover–verifier pair, and a structured multi-agent project with a reviewer gate (§1, p. 2).

Inference: the paper teaches process controls for untrusted model-generated mathematics, not a proof system. Its economic formulas are demonstrations, and should not be imported as verified facts.

## technique 1: disciplined single pass

What it is. One model writes a complete proof under a strict writing standard and is its only critic. The paper says the standard requires “no gaps between steps, every derivative signed and the sign justified, every definition bridged to its later use, intermediate algebra shown rather than asserted, the general case proved rather than inferred from small examples” (§3.1, p. 6). It also forbids “it is easy to see,” “clearly,” and “the other case is similar” (§3.1, p. 6).

When to use it. Use it for a small self-contained derivation, an exploratory lemma, or as a drafting stage before external checking. The paper cautions that a polished result should not be the last word on a load-bearing claim because no independent checker or numerical audit is present (§3.1, p. 7).

How to do it. (1) Invoke the versioned `math-proof` skill with a claim or proof sketch and model primitives (§3, p. 6; §3.1, p. 6). (2) State the claim before proving it (§3.1, p. 6). (3) Show intermediate algebra, sign every derivative, bridge each definition to its use, and prove the general case (§3.1, p. 6). (4) Distinguish proved from conjectured statements and mark every load-bearing plausible but unestablished step (§3.1, p. 6). (5) Emit one self-contained proof document (§3.1, p. 6).

Verus form. Inference: use an executable Rust function with an `ensures` contract for the target property, a `requires` clause for explicit assumptions, and `assert` or `proof fn` steps for intermediate algebra. Keep conjectural obligations out of the postcondition until proved. Inference: this method does not provide independent assurance in Verus either; the model can write a syntactically verified but semantically weak contract.

Evidence and limits. The single pass correctly refused to claim budget balance and flagged an individual-rationality dependency, but the paper reports no numerical check for it (§3.1, p. 7; §6, p. 15). The limitation is structural: self-flagging cannot catch an error the model does not perceive (§3.1, p. 7).

## technique 2: adversarial prover–verifier pair

What it is. Claude Opus 4.8 proposes; OpenAI Codex (gpt-5.5) is instructed to refute; a human author triages the findings (§3.2, p. 7). The paper's operational rule is: “Codex is brilliant and unreliable, and every output is a lead, not a verdict” (§3.2, p. 7).

When to use it. Use this for a single hard, load-bearing claim where a counterexample would be decisive: existence, uniqueness, incentive properties, or a conjecture that a direct proof cannot settle (§3.2, p. 8). The method is narrower than a project and deeper than a self-check.

How to do it. (1) Give the proposed result and proof to an independent model through the `codex-math` skill (§3.2, p. 7). (2) Select verify, prove, or explore mode; the paper identifies exploration as most valuable for counterexamples and boundary conditions (§3.2, p. 7). (3) Run at effort matched to the stakes (§7.2, p. 21). (4) Ask for a concrete counterexample, sign error, missing existence argument, or unjustified step (§7.1, p. 20). (5) Have the human inspect every finding: accept a concrete catch, document and dismiss a convention mismatch or unnecessary-generalization false positive (§3.2, p. 7; §7.3, p. 22). (6) Repair and rerun, or move the claim to the open ledger (§7.1, p. 20).

The worked run overturned three claims: a K2,2 counterexample reduced ex-post incentive neutrality to neutrality in expectation; an m-fold mixed derivative refuted budget balance; and a leave-one-out necessity claim was downgraded after the standard estimator was shown to have first-moment exactness (§3.2, p. 8).

Verus form. Inference: run a second agent against the exact Verus function and contract, asking it to produce a counterexample input or an invariant gap. Then require a human or trusted review to distinguish a real failed precondition from an irrelevant challenge. A successful `cargo verus` run is the kernel's evidence for the encoded contract; it does not validate the adversary's prose or the contract's adequacy.

Evidence and limits. The paper reports three genuine catches in one worked example, but does not estimate a catch rate or false-positive rate; it says Codex produces both kinds and they are distinguishable only by inspection (§3.2, p. 7). Thus the denominator is three catches out of one adversarial run, not a general reliability percentage.

## technique 3: multi-agent project with reviewer gate

What it is. A project coordinator, literature reviewer, prover, coder, and paper reviewer work in separate streams under an approved goal set. `co-math-init` creates `paper.tex`, `goals.md`, `decisions.md`, and a workstream registry; `co-math-status` renders goals, running and blocked streams, reviews, and obligations (§3.3, p. 8). Strict mode requires every gap to be marked `\\unproven{}` and completion requires a durable verdict: approve, approve-with-flags, or reject (§3.3, p. 8).

When to use it. Use it for a research program with interacting sub-results, literature work, numerics, and a paper-level audit trail (§3.3, p. 9). Its cost is coordination and its failure mode is breadth that looks like progress; strict flags make that visible (§3.3, p. 9).

How to do it. (1) Initialize a project with a research question and approved goals (§3.3, p. 8). (2) Decompose goals into workstreams and assign distinct roles (§3.3, p. 8). (3) Require strict mode to flag every unproved step (§3.3, p. 8). (4) Use the adversarial pair for hard checks inside the project (§3.3, p. 8). (5) Have a reviewer issue approve, approve-with-flags, or reject for each sub-goal and write the verdict to disk (§3.3, p. 8). (6) Preserve rejected claims and counterexamples as negative results, not as silently deleted work (§3.3, p. 8).

The reviewer rejected a peer-prediction sub-goal because a leave-one-out residual was independent of the grader's signal, so a constant prior-mean report beat honesty (§3.3, p. 8). The paper reports the rejected sub-goal as an explicit negative result.

Verus form. Inference: map each workstream's Rust artifact to a module with explicit `requires`/`ensures`; keep unresolved proof obligations in a ledger; require a reviewer to approve the exact contract and its verifier output. Verus state-machine proofs can represent shared abstract state, but this project protocol, role separation, and durable verdict files are external process controls.

## technique 4: composed gates, ledger, and reproducibility trail

The paper composes the methods in order: “scope and decompose with the multi-agent project, drive each lemma with the single pass, and gate every load-bearing claim with the adversarial verifier and numerics before it enters the paper” (§7.1, p. 20). Stage 1 outputs goals, a dependency graph, a literature map, and an empty obligations ledger; Stage 2 outputs a precise candidate lemma and uncertain steps; Stage 3 attaches verifier and numerical evidence or returns the lemma for repair (§7.1, pp. 20–21).

The four gates are: a self-discipline gate, an adversarial gate, a numerical gate, and a reviewer gate (§7.3, pp. 21–22). Numerical checks are selected by claim type: Monte Carlo for distributions, symbolic computation for identities, gradient checks for derivatives, and direct equilibrium computation for solution concepts (§7.3, p. 22). The paper's rule is: “A claim with computable content that has no numerical record is not verified, however clean its proof reads” (§7.3, p. 22).

The open-obligations ledger names every unverified step, records transitions and reasons, and ships as an appendix (§7.4, p. 22). The reproducibility trail stores the statement, proof, verifier prompt and transcript, effort level, numerical scripts and seeds, outputs, and reviewer verdict (§7.4, pp. 22–23). It preserves negative results and human triage because verifier output is not self-certifying (§7.4, p. 23).

Verus form. Inference: implement the ledger and gate as CI artifacts keyed to each Rust function and contract. Require a Verus verification transcript, independent tests or model checks where computable, and a reviewer verdict before a contract is marked load-bearing. Keep assumptions and rejected obligations in versioned files; never infer assurance from prose or a green build alone.

## what is proved, measured, and trusted

The paper does not claim that the economic model is verified. Its measured evidence consists of one worked example, three protocol runs, three catches in the adversarial run, one reviewer-rejected sub-goal, and convergence of two runs on an effective-resistance kernel (§1, pp. 2–3; §6, pp. 16–18). The author explicitly says these are demonstrations from one example, “not measured rates” (§6, p. 16). What remains trusted includes the human's mathematical triage, the model's assumptions, the numerical implementations, and the protocol code; no theorem prover kernel checks the economic formulas.

The paper's realistic deliverable is a “disciplined frontier” rather than a finished theorem (§7.5, p. 23).

## techniques for the catalog

- disciplined single pass — force complete, explicit derivations and mark conjectures before external checking
- adversarial prover–verifier pair — have an independent model seek counterexamples, then human-triage every finding
- multi-agent reviewer-gated project — decompose research into role-separated workstreams with strict gap flags and durable verdicts
- composed verification gates — combine self-discipline, adversarial, numerical, and reviewer gates before a claim enters a paper
- open-obligations ledger — record every unresolved step, transition reason, and negative result
- reproducibility trail — attach prompts, transcripts, scripts, seeds, outputs, and reviewer decisions to each load-bearing claim
