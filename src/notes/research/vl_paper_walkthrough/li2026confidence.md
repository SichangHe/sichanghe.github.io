# Confidence-Guided Protocol IR for LLM-Aided Security Protocol Modeling
(authored by agents unless marked 🧑)
Tag: `li2026confidence`, [paper](https://doi.org/10.48550/arxiv.2609.37396)

## central method

This paper inserts a human-auditable Protocol Intermediate Representation (IR) between a natural-language protocol description and generated SAPIC+/Tamarin code. The abstract identifies the bottleneck: “the main correctness bottleneck is the semantic accuracy rather than the syntactic validity of the intermediate protocol representation.” (Abstract, p.1). The IR records roles, value provenance, messages, cryptography, checks, events, proof goals, compromise assumptions, and expected counterexamples. The initial IR is untrusted; after review it becomes the semantic source for code generation. The paper states: “the initial IR is untrusted, but the reviewed IR becomes the trusted source for model generation.” (Section 1, p.3).

Inference: the transferable idea for VeruLaw is a reviewed semantic contract between an LLM and a verifier. It does not prove that the IR-to-model translator is correct; the paper explicitly lists that as a limitation (Section 5.2, p.19).

## technique 1: construct an evidence-bearing Protocol IR

What it is. Instead of asking an LLM for final Tamarin code, ask it for a structured semantic draft. Each field has a value plus evidence: a source quote when directly supported, an inferred marker when derived, or an assumption marker when unsupported. The IR separates fresh execution values from long-term setup, records sender and receiver derivability, and gives checks and events explicit locations.

How to apply it. (1) Supply protocol prose, optional attacker/setup assumptions, and optional proof goals (Section 2.1, p.6). (2) Generate fields for fresh values (name, owner, purpose), cryptographic declarations, long-term state, messages (sender, receiver, protection, term), role-local actions, checks, events, proof targets, and compromise rules (Section 2.1, pp.4–6). (3) For every field, request supporting source evidence; mark it inferred or assumed if no direct span exists (Section 2.2, p.8). (4) Validate the candidate for missing proof events, events before checks, conflicting value classes, and derivability failures (Section 2.1, p.6). (5) Present the fields as editable review cells before any SAPIC+ generation (Section 2, p.3).

The example IR uses schema `protocol_ir_v1`, fresh `~k` owned by C, and a message term `aenc(~k, pk(ltkS))`; its evidence records the source quote “encrypts it with the public key pkS” (Listing 1.1, p.6). This code shape makes both the formal term and its natural-language meaning inspectable.

Verus form. Inference: define a Rust/Verus ghost IR struct or enum for roles, values, messages, checks, events, and assumptions. Use `spec fn` predicates for provenance and derivability, and `requires`/`ensures` on a proof function that validates field relationships. Store source spans and confidence as non-proof metadata; Verus can prove consistency of the semantic fields but cannot establish that an English quote was interpreted correctly. The reviewed IR should be immutable input to the generated Rust proof skeleton.

Evidence and limits. The framework’s benchmark uses four models and 18 protocols, but IR quality is measured at emitted UI cells, not fixed reference obligations (Section 3, pp.10–11). The paper warns that output-conditioned metrics do not measure recall over missing fields (Section 3, p.11). A validly typed IR can still encode the wrong protocol.

## technique 2: prioritize review with three confidence signals

What it is. Review effort is directed by evidence confidence, consistency confidence, and semantic impact. Evidence confidence reflects direct textual support; consistency checks cross-field contradictions such as use-before-generation or an event before its check; semantic impact estimates whether an error can change the verification meaning. The priority formula is:

```
priority(f) = max(1 − evidence(f), 1 − consistency(f)) × impact(f)
```

(Section 2.3, p.9).

How to apply it. (1) Assign evidence confidence from direct, contextual, or absent source support (Section 2.3, p.8). (2) Compute consistency by checking value provenance, role knowledge, event ordering, and value classification (Section 2.3, pp.8–9). (3) Assign semantic impact, with high impact for proof targets, checks, events, and compromise assumptions (Section 2.3, p.9). (4) Compute the priority score and sort review cells (Section 2.3, p.9). (5) In the UI, show confidence, diagnostics, recommended action, and source evidence; let a reviewer mark a cell Confirmed or Assumed (Section 2.1, pp.6–7).

Verus form. Inference: use the same score to order human review of generated `requires`, `ensures`, ghost state, and external assumptions. The score is workflow metadata, not a proof. High-impact cells should gate code generation; a Verus proof passing after an unreviewed assumption is not evidence that the intended requirement was captured.

Evidence. The review interface exposes unresolved-cell counts and status badges (Section 2.1, p.6). Its purpose is to avoid line-by-line inspection of low-level generated code while surfacing semantic decisions. The limitation is that confidence “cannot guarantee that all semantic errors will be found” (Section 5.2, p.19).

## technique 3: compile only from the reviewed semantic source

What it is. The reviewed IR is translated systematically: fresh values become declarations; setup becomes persistent facts or role parameters; messages become input/output actions; checks become equality, `let`, or conditional tests; events become annotations; proof targets become Tamarin lemmas; compromise assumptions become reveal rules and attacker knowledge (Section 2.4, p.9).

How to apply it. (1) Save edits as a reviewed modeling contract and materialize it back into the IR (Section 2.1, p.7). (2) Translate each IR category with the mapping above (Section 2.4, p.9). (3) Preserve event placement, attacker capabilities, and checks exactly; the generation prompt must not add checks, remove capabilities, or move events without a reviewed IR change (Section 2.4, p.9). (4) Optionally retrieve proof-engineering hints for medium or hard cases, such as compact event payloads or bounded role topology (Section 2.4, p.9). (5) Run the generated SAPIC+ model through Tamarin 1.12.0 with Maude 3.5.1 (Section 3, p.10).

Verus form. Inference: generate Rust/Verus data types and proof obligations from the reviewed IR, preserving role ownership, message order, and attacker capabilities as ghost state. A translator should emit `requires`/`ensures`, `spec fn` predicates, and proof lemmas; it must not silently strengthen contracts to ease verification. The paper’s SAPIC+ mapping is an architectural template, not Verus syntax.

Evidence and limits. In Table 2, GPT-5.5 generated models for all 18 protocols and Tamarin verified 14/18; the denominator is 18 protocols in one round (Table 2, p.12). DeepSeek compiled 18/18 but met expected verification outcomes for 9/18. GPT-4o compiled and verified 1/18; Llama 0/18 for both. These are case-level totals, not per-cell correctness rates. The authors say a case succeeds when Tamarin accepts the model and all target properties are verified or expected attacks are produced (Section 3.2, p.12).

## technique 4: separate syntactic repair from semantic repair

What it is. After generation, the framework permits automatic repair only for syntax and backend compatibility. A semantic repair changes protocol meaning (event placement, checks, attacker capabilities, or proof targets) and must return to IR review. The paper states: “Syntactic repair can be automated safely because it does not alter the intended protocol semantics. Semantic repair requires returning to the IR and asking the user to review the affected field.” (Section 2.5, p.10).

How to apply it. (1) Submit generated SAPIC+ to Tamarin (Section 2.5, p.10). (2) Classify each failure as malformed syntax, declaration/backend issue, warning, proof-lint issue, or semantic mismatch (Section 2.5, p.10). (3) Automatically repair only the first class when the reviewed IR supports the edit (Section 2.5, p.10). (4) For a semantic change, edit the corresponding IR field, obtain confirmation, regenerate, and rerun Tamarin (Section 2.5, p.10). (5) Compare counterexamples with expected attacks and compromise assumptions instead of treating every counterexample as a modeling bug (Section 2.5, p.10).

Verus form. Inference: keep contract and assumption files read-only during proof repair. Allow an agent to change proof bodies, `assert` hints, loop `invariant`s, and proof lemmas for solver failures; route changes to `requires`, `ensures`, `spec fn` definitions, or trusted external specifications through an IR review gate. A failed Verus proof is not a license to weaken the specification.

Evidence. The KEMTLS case demonstrates the distinction. The raw IR merged ServerHello, KEM encapsulation, public key, and nonce into one plaintext row; review split it into plaintext M2 and encrypted ServerCert M3, then recorded key derivation and decryption checks (Section 4, pp.15–16). The reviewed model compiled and matched all five KEMTLS target outcomes (Section 4, p.16). Tamarin could not infer that “same flight” required two semantic steps; the IR review exposed it.

## technique 5: compare generated models structurally and inspect causality

The paper normalizes identifiers/constants and compares generated and manual SAPIC+ models as multisets of structural atoms across value provenance/setup, message structure, cryptographic dependencies, and verification checks (Section 3, p.11). It reports Precision = |M|/|G|, Recall = |M|/|R|, and F1 = 2PR/(P+R) (Section 3, p.11). Across 18 GPT-5.5 models, F1 is 0.714 for provenance/setup, 0.560 for messages, 0.656 for crypto, and 0.478 for checks (Table 3, p.13).

The authors also inspect errors that bag-of-atoms metrics miss. EDHOC’s generated model lets one process construct both roles and verify its own signature without a network input; SSH treats locally generated server values as peer-provided (Section 3.3, pp.13–14). These are causal errors even when many structural atoms match.

Verus form. Inference: use structural comparison as a pre-proof diagnostic for generated Rust, then add relational proof obligations for role order, ownership, and input provenance. A passing F1 score cannot replace a proof that a value came from a peer rather than local computation.

## evaluation, trust, and product threat

Setup: experiments ran on an Apple M5 Pro MacBook Pro (15-core CPU, 16-core GPU, 24 GB RAM, macOS 26.5); LLM calls were provider-hosted June 7–8, 2026; Tamarin was 1.12.0 and Maude 3.5.1 (Section 3, p.10). Table 1’s averages use UI-visible cells: GPT-4o EMR 51.9%, SA 77.4%, WFR 82.1%, and 19.7 repairs; GPT-5.5 EMR 36.1%, SA 99.96%, WFR 44.8%, and 0.1 repairs (Table 1, p.12). WFR’s denominator is provenance uses, whereas SA’s denominator is labeled cells; the paper explicitly says they measure different things (Section 3, p.11). GPT-5.5’s high SA therefore does not imply high provenance correctness.

The 18-case totals in Table 2 report GPT-5.5 14/18 verification success and 12 total edits, while DeepSeek reports 9/18 and 1302 edits (Table 2, p.12). Generation times are outcome-conditioned; failed runs may stop before proof search, so totals must not be used as direct efficiency comparisons (Section 3.4, p.15). The text repeats the sentence “We also report model generation and verification time in Table 2.” (Section 3.4, p.15), but gives no variance.

Proved or measured: field-level extraction metrics, case-level Tamarin acceptance and expected outcomes, structural alignment, UI edits, and wall-clock times. Trusted: the natural-language source, LLM extraction, reviewer judgments, reviewed IR, the IR-to-SAPIC+ translator, Tamarin/Maude, and the cryptographic model assumptions. The paper does not prove the translator correct (Section 5.2, p.19).

Inference: threat to agent-written verified Rust is high if a passing proof is treated as semantic correctness. This workflow’s strongest safety contribution is forcing review of attacker capabilities, value provenance, and event order before proof. VL should reuse the semantic-checkpoint and repair-boundary design rather than redo Protocol IR; its open engineering task is a Verus-specific IR whose reviewed fields map to executable ownership and proof contracts.

## techniques for the catalog

- evidence-bearing IR — capture protocol values, messages, checks, events, assumptions, and source evidence before code generation
- confidence triage — prioritize review by evidence support, cross-field consistency, and semantic impact
- reviewed-source generation — translate only the confirmed semantic IR into formal model code
- repair boundary — automate syntax repair but require renewed review for semantic changes
- structural and causal comparison — compare generated models with references while inspecting role order and input provenance
- counterexample classification — compare traces with expected attacks instead of assuming every failed lemma is a modeling error
Checked 2026-10-15 against paper li2026confidence: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
