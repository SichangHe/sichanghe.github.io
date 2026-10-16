# Theoria: Rewrite-Acceptability Verification over Informal Reasoning States
(authored by agents unless marked 🧑)
Tag: `saldivar2026rewrite`, [paper](https://www.semanticscholar.org/paper/1b7f5d662bcbfad7e808eeb6ef991b71ab01a58f)

Theoria is a verification architecture for answers that remain in natural language. Its central object is a machine-readable witness: an initial state followed by typed state transitions. The paper says, “Theoria occupies a third point in this space” between formal proof assistants and scalar LLM judges (§1, p.2). The goal is a certified-or-declined decision with a trace that exposes assumptions and permits local audits.

## technique 1: typed state-rewrite witnesses

What it is. A witness contains a problem, an initial state `S0`, and transitions `(Si, τi, ei)`, where each state is an ordered list of established claims and unresolved items. The three justification types are `citation`, `computation`, and `problem given`. The paper defines the local obligation: “does justification ei of type τi license the entire change from Si−1 to Si?” (§3.1, p.3). This deliberately avoids pretending that the witness is a Lean proof term while making changes inspectable.

When to use it. Use this when requirements are informal or autoformalization is too expensive, but a product still needs an auditable decision. It is especially useful when hidden premises, fabricated references, or silent convention changes are plausible. It is less suitable when a domain needs justification types beyond the three tags; the authors identify statistical and experimental reasoning as examples (§8.9, p.16).

How to apply it.

1. Set `S0` to a goal slot such as `ANSWER = ?`, plus only facts literally present in the problem or notation restatements (§3.1–3.4, pp.3–4)
2. Have a formalizer rewrite the solver answer into successive states. Each state must show the changed claims, definitions, domains, parameters, and answer slot (§3.2, p.3)
3. Attach exactly one tag and evidence item to every transition (§3.1, p.3)
4. Put any newly needed premise into its own preceding justified step; do not use it silently (§5.2, p.7)
5. Require the local judge to check the complete before-to-after change, not merely whether the new state is true (§3.2, p.3)

Inference: in Verus, the executable Rust function should carry `requires` and `ensures` contracts, while a separate `proof fn` can establish lemmas about each transition. A state can be a ghost/spec sequence; executable code and proof code remain separate, as required by Verus. The paper's typed tags do not carry over as a built-in Verus feature, so they would be metadata in a proof-generation pipeline. Inference: a transition could be represented by a lemma whose precondition is the old state and whose postcondition is the new state, with `assert` steps for arithmetic and cited lemmas for theorems. Verus has no need for an `old` call in a `spec fn`; use function contracts and ghost state according to the Verus guide.

Evidence and limits. The architecture is evaluated on 185 completed HLE-Verified Gold problems. It certified 105, of which 96 matched the strict key: “Strict certified precision: 96/105 = 91.43%” (§8.2, p.9). Coverage was 105/185 = 56.76%; the 80 declined answers had a 42.5% strict wrong rate versus 8.6% for certified answers (§8.2, p.9). On GPQA Diamond, 33/34 certified answers were correct (97.1%) out of 65 problems (§8.8, p.16). These denominators are the completed runs, after 9 crashes and 6 policy blocks out of 200 requested (§8.1–8.2, pp.9–10).

The trust boundary is explicit. The solver and formalizer are not trusted; judges remain LLMs (§5.1, p.7). The paper states, “Theoria’s theoretical claim is that the rewrite format reduces the first term. The second term depends on judge capability and is addressed empirically, not architecturally” (§4.1, p.5). An initial-state misinterpretation or a meaning shift that causes no observable mutation can remain invisible (§4.4, p.6). Inference: a Verus integration can prove a transition implementation once its specification is correct, but cannot prove that a natural-language problem was modeled correctly.

## technique 2: completeness-of-change invariant

What it is. Let `Δ(Si−1,Si)` be all semantic mutations and `Lτ(e;Si−1,P)` the changes licensed by evidence. The invariant is `Δ ⊆ Lτ`, plus the requirement that all premises be in the previous state or introduced by an earlier justified step (§3.2, p.3). The paper calls it “a conservation law over proof-state changes” (§3.2, p.3).

When and how to use it. Use it for every transition. Enumerate additions, removals, strengthened hypotheses, instantiations, rewrites, domain changes, definition changes, and answer changes; then reject any mutation not licensed by its tag and evidence (§3.2, p.3). If a hidden premise is needed, either add it visibly (where it becomes an unlicensed mutation) or reject the incomplete representation. This is the paper's Proposition 4.4 (§4.2, p.6).

Inference: a Verus version would encode the state relation as a `spec fn` and prove a lemma that every permitted post-state mutation follows from the pre-state and evidence model. The mutation enumeration itself is outside Verus's ordinary solver automation and would likely be generated as ghost data. Use `assert` and `ensures`; do not mark the function under verification `external_body`, because that removes the proof obligation.

Evidence. In 95 poisoned proofs across 15 domains, structured judges caught 90/95 (94.7%) versus 79/95 (83.2%) for holistic judging; McNemar exact `p = 0.0017` (§8.7, p.15). The predicted exposure advantage appears for hidden premises (29/32 = 90.6% versus 20/32 = 62.5%) and fabricated citations (20/20 = 100% versus 18/20 = 90.0%). Arithmetic (19/20 = 95.0% for both), circular reasoning (9/9 for both), and misapplied theorems (13/14 = 92.9% for both) show no format advantage (§8.7, p.15). The denominator and error category are those in Table 9; the paper's prose and table agree.

Failure boundary. Proposition 4.6 says an error with no semantic state mutation is unobservable (§4.4, p.6). Inference: completeness-of-change is therefore an exposure guarantee, not a soundness theorem. Product risk remains in judge misses, maliciously engineered witnesses, and wrong initial specifications.

## technique 3: specialized judges, pedantry filtering, convention lift, and bounded repair

The pipeline is “solve → formalize → judge → filter → repair” (§5.1, p.7). Computation steps go to a recomputing computation judge; citations to a judge checking existence and applicability; problem-given steps to a judge comparing directly with the problem; and `S0` to an independent initial-state judge (§5.3, p.7). Judges are prompted adversarially to find errors. A pedantry filter enumerates every issue and permits override only when every issue is cosmetic (§5.4, p.7). A convention lift may add one explicit, citable domain convention only when it is normally assumed, published, and fully resolves the rejection (§5.5, p.8). Finally, failed verdicts enter a bounded repair loop; otherwise the answer is declined (§5.6, p.8).

Inference: Verus can realize the specialization through separate proof lemmas and solver contexts, but not through runtime judges. Arithmetic obligations can be discharged by `assert`/`assert forall` and arithmetic solver support; domain conventions must become explicit `requires` assumptions. A bounded repair loop should regenerate source and rerun `verus`, while a successful proof remains conditional on the stated contracts.

Evidence and product implications. At matched 105-item coverage, holistic Opus had 97/105 (92.4%), Codex 98/105 (93.3%), and Theoria 96/105 (91.4%); differences were not statistically significant (McNemar `p = 0.88` and `p = 1.00`, §8.4, pp.11–12). The paper therefore does not establish higher raw precision. Its practical evidence is auditability and complementary errors: pairwise error Jaccard indices were 0.14–0.36 (§8.5, p.12), and a majority ensemble reached 102/109 = 93.6% at 58.9% coverage (Table 7, p.13).

What is proved, measured, and trusted. The paper proves the exposure propositions under its state model, and measures precision, coverage, error overlap, and adversarial detection. The LLM judges, web search, benchmark keys, formalizer, semantic diffing, convention registry, and eventual Lean/CAS backstops remain trusted or unavailable. The authors state that semantic diffing “relies on the judge’s language understanding rather than an explicit diff layer” (§9, p.18). Inference: agent-written verified Rust inherits the specification gap and judge gap; Theoria reduces hidden-premise exposure but cannot replace kernel checking of executable behavior.

## techniques for the catalog

- typed rewrite witness — represent an informal answer as typed, auditable state transitions
- completeness-of-change — reject every state mutation not licensed by explicit evidence
- initial-state audit — require `S0` to contain only problem-given facts and a goal
- specialized local judges — route citation, computation, problem, and initial-state checks separately
- pedantry filter and convention lift — distinguish cosmetic rejection from a single explicit domain convention
- certify-or-decline repair — bound correction attempts and abstain when a witness cannot be certified
