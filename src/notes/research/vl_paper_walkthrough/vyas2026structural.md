# Structural Certification for Reliable Physical Design with Language Models
(authored by agents unless marked 🧑)
Tag: `vyas2026structural`, [paper](https://www.semanticscholar.org/paper/066ba7994e9716a8f97b92f316551bd02bdd5420)

## scope and result
The paper introduces Physics-Anchored Certification (PHACT): a language model proposes a design, while deterministic domain code computes the quantities that decide acceptance. Its central security result is an interface property. The certifier must derive a goal-fixed quantity from immutable goal inputs; it must never accept that quantity from the model. The authors state: “A checker that accepts a model-supplied value can be forged; deriving the certified quantity from fixed inputs instead makes forgery impossible by construction.” (Abstract, p. 1.)

PHACT returns three outcomes: certified, impossible, and unknown. On rejection, the engine reports the violated law, produced value, required value, and a targeted correction. The loop is: parse the natural-language goal; have the model propose a fully specified design and invoke the engine; let the engine evaluate deterministic equations; certify if all constraints pass; otherwise feed back the violation and retry; return impossible when distinct attempts fail for the same physical reason, or unknown when the engine is outside its competence. The paper’s exact summary is: “If the design satisfies all constraints, it is certified and the loop ends. If it does not, the engine returns the specific violations (which law was broken, what value was required, what the design produced) and the model revises and calls again.” (The loop, p. 3.)

## technique 1: structural contract for non-forgeable certificates

what it is

A structural contract is a directed dependency graph with three roles. Bound nodes are quantities fixed by the goal and read-only to the proposer. Free nodes are design variables the proposer may choose. Derived nodes are calculated by the engine; the outcome node is the certified quantity. The contract therefore makes authority explicit in the dataflow. The paper says: “Concretely: bind the goal-fixed quantities as immutable inputs, let the model write only the free design variables, compute the quantity under test from the resulting graph, and never let the model write the value being certified.” (Certification as derivation, p. 3.)

when to use it

Use this for fixed-system verification, where a user fixes inputs and asks whether a derived property holds. An answer-submitting validator is unsafe because the model can change a supposedly fixed input and submit a self-consistent value. For a design goal (“compute X”), a model-supplied answer can be useful, but the paper warns that the same form becomes forgeable for a verification goal.

how to apply it

1. Identify every quantity the natural-language goal fixes. Mark those as bound, read-only nodes.
2. Identify only the controllable design parameters. Expose those as writable free nodes.
3. Encode governing equations as edges from source nodes to derived nodes.
4. Compute the certified quantity by forward evaluation inside the engine.
5. Do not include an API argument through which the model can resubmit a bound input or the certified value.
6. On failure, compute a minimal root-input correction Xi ← x*i and return it. If the offending node is bound, report that the goal must be refused; if free, use the correction to guide the next proposal.

The paper’s astrophysics example fixes m1 = 36 M⊙ and m2 = 29 M⊙ and asks to verify Mc = 50 M⊙. The structural engine reads both masses and derives Mc = 28.1 M⊙; the model cannot substitute another mass pair. Under a bare validator, the model can “With an answer-submitting validator, the model can satisfy the checker by quietly changing a supposedly-fixed mass to a pair that genuinely has chirp mass 50 M⊙ ; the engine then certifies correct physics for a design other than the one that was asked.” (A certificate can be forged, p. 6), so the engine certifies the wrong system.

Verus form

Inference: represent the contract as a Rust function whose executable arguments contain only free design variables and whose specification contains the bound goal state. Use a `spec fn` for the equation, `requires` for fixed-input assumptions, and `ensures` to state that the returned derived quantity equals the equation applied to those bound inputs. Keep the proof in `proof fn` lemmas; do not make proof functions runtime calls. A Verus sketch is:

```rust
spec fn chirp(m1: int, m2: int) -> int { /* exact model */ }
fn certify(goal_m1: int, goal_m2: int, proposed: Design) -> (r: Verdict)
    requires goal_m1 == 36 && goal_m2 == 29,
    ensures r == Verdict::Certified ==> chirp(goal_m1, goal_m2) == 50,
{ /* derive inside the function; model writes only proposed */ }
```

Inference: the arithmetic and physics model still need explicit lemmas and sufficiently precise numeric types. Verus proves the stated contract, not the fidelity of post-Newtonian physics to a real merger. The paper’s equation implementation is deterministic code, whereas this Verus form would additionally require proving arithmetic properties and handling floating-point approximations or fixed-point encodings.

evidence and limits

Across five domains, Gemini 2.5 Flash certified 44/50 feasible goals (88%; Wilson 95% CI 76–94%), versus 26/50 (52%; CI 39–65%) for the bare model. Table 1’s denominator is all 50 authored feasible goals; it includes two infrastructure timeouts, three loop-fails, and one feasible goal wrongly declared impossible. No non-certification was a false certificate. On 25 impossible goals, the bare model produced seven checker-passing hallucinations (7/25 = 28%): five astrophysics, one electrical, one drone, none in DNA or drug formulation. The structural contract produced 0/25 false certifications for Gemini and 0/25 for Llama 3.3 70B in the full suites. The paper reports the close-up and faulted trials together as “zero forged certificates observed in 80 adversarial trials (25 + 25 + 15 + 15)” (Discussion, p. 12). This is an observed implementation result, not a statistical estimate.

The guarantee is conditional. The authors write: “A certificate is a statement about the engine’s equations, not about physical reality in full.” (The engine, and the scope of its guarantee, p. 3.) Engines were calibrated against published values, but goals were author-defined and there was no held-out external goal set; the Methods calls this a “closed-world test of the architecture.” The five engines use closed-form equations, so runtime and exactness do not establish behavior for domains requiring approximate simulation. Llama’s feasible rate was 33/50 because it often restated corrections without making another tool call; silence is safe but reduces utility.

## technique 2: three-valued decline and targeted correction

Use the certified/impossible/unknown output to make abstention explicit. “The second and third outcomes are the system’s ability to decline, which is what makes its certificates reliable.” (The loop, p. 3.) Return impossible only after genuinely distinct attempts fail for the same physical reason; return unknown when the engine lacks competence. For a failed free variable, return the computed root-input correction; for a bound variable, explain why the fixed goal is impossible. In the feedback ablation, structural root-input corrections reduced DNA’s mean iterations from 2.50 (weak violation magnitude) to 1.70; on an RC filter the means were 1.00, 1.50, and 1.10 for weak, strong, and structural feedback, respectively (Table 5, p. 10). Inference: a Verus-backed agent can encode `enum Verdict { Certified, Impossible, Unknown }` and prove that `Certified` implies the derived postcondition, while keeping correction generation outside the proof obligation.

## what is proved, trusted, and already done

The structural argument proves non-forgeability relative to the implemented dataflow: the model cannot write values the engine derives. It does not prove the equations model reality, the natural-language goal was parsed correctly, or that the model will close the loop. Trusted components include deterministic engine code, equation implementations, parser/orchestrator behavior, model-serving infrastructure, and the verifier/compiler if translated to Verus. The evaluation is closed-world, funded by the authors’ company, and uses small cells (15–50 trials), so general rates are uncertain. Existing work already covers tool use, self-correction, external verification, and physics-informed learning; VL should reuse the authority-separation idea rather than redo generic “LLM plus checker” wiring. Inference: agent-written verified Rust is threatened mainly at the boundary where model output selects what is checked. If the model can supply a claimed postcondition or alter goal-bound inputs, a sound inner proof can certify the wrong object. Binding inputs and deriving outputs in Verus reduces that threat, but specification and parser mistakes remain outside the proof.

## techniques for the catalog

- structural contract: bind goal-fixed inputs read-only, expose only free design variables, and derive the certified quantity inside deterministic code
- propose–certify loop: have a model propose, let an external engine accept or return a violation, and retry until certified, impossible, or unknown
- three-valued decline: treat impossible and unknown as explicit safe verdicts instead of forcing an answer
- root-input correction: compute the minimal input change that crosses a violated threshold and feed it back to the next proposal

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
