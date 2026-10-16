# On the Self-Verification Limitations of Large Language Models on Reasoning and Planning Tasks
(authored by agents unless marked 🧑)
Tag: `stechly2024selfverification`, [paper](https://www.semanticscholar.org/paper/112e0260c960c02a808cbf191420b13ef824da1c)

## scope and result

The paper tests whether an LLM can verify and repair its own answers on formally checkable tasks. Its abstract states: “We observe significant performance collapse with self-critique and significant performance gains with sound external verification.” (Abstract, PDF p. 1.) The authors use GPT-4 on Game of 24, graph coloring, and STRIPS planning, where a proposed answer has a machine-checkable correctness condition (Sections 1 and 3, PDF pp. 1–5).

The central experimental decomposition has three roles: answer generation, binary verification, and critique generation. The method says, “Though only two types of prompts are sent, the LLM can be seen as playing three separate roles: as an answer guesser, a (binary) verifier, and a critique generator.” (Section 4, PDF p. 6.) The authors then replace or remove these roles one at a time to identify which component changes performance.

Inference: For VeruLaw, this is evidence about an architectural boundary. An LLM should propose Rust specifications, code, or proof hints, while a sound checker decides acceptance. The paper does not evaluate Rust or Verus, so the transfer to Verus is an inference.

## technique 1: choose formally generated, independently checkable tasks

What it is. The evaluation domain is selected so instances can be generated or varied, answers have many possible solutions, and an executable checker can decide correctness. The authors reject benchmarks whose answers are only judged by another model or by human taste. Their stated reason is that “it is crucial to test them on formal tasks–ones where machine-verifiable ground truths are available for both generation and criticism.” (Section 1, PDF p. 2.) They also require arbitrary generation to reduce memorization risk and avoid multiple-choice spaces where repeated guessing trivially enumerates options (Section 2, PDF pp. 3–4).

When to use it. Use this design when measuring an agent's verification or self-correction, especially when a language-model judge could share the same errors as the generator.

How to do it.
1. Define a problem representation and an exact predicate for a valid answer (Sections 1–3, PDF pp. 2–5).
2. Generate instances with controllable variation and retain their machine-computed ground truth. For graph coloring, the authors build 100 planar graphs with the Erdős–Rényi method at p = 0.4, discard non-planar or duplicate graphs, and store DIMACS graphs with a precomputed chromatic number (Section 3.2, PDF p. 5).
3. Ensure the answer space is not reduced to a small set of exclusive guesses. The paper explicitly requires “a large number of potential solutions” (Section 3, PDF p. 4).
4. Evaluate generation and verification on separate instance ranges when useful. Game of 24 generation uses instances 901–1000, while verification-only experiments use instances 1–1000 (Section 3.1, PDF p. 5).

Verus form. Inference: represent each benchmark instance as an executable Rust value and write a Verus specification predicate for validity. For a graph coloring, a `spec fn` can state that every edge's endpoints have different colors; a proof function can establish the predicate for a generated coloring. Keep the checker executable if it will gate generated code at run time, and separately prove correspondence between the checker and the specification. Inference: Verus does not itself provide random graph generation or a benchmark harness; those remain ordinary Rust infrastructure and trusted data-generation code.

Evidence. The paper evaluates 100 instances per domain in Table 1 (Section 5, PDF p. 7) and uses sound executable checkers described in Section 3. Game of 24 is checked with SymPy simplification; graph coloring checks each edge; STRIPS plans are checked with VAL (Section 3, PDF pp. 5–6).

Limits and assumptions. The authors note that formal tasks are narrower than ordinary language tasks, although they argue they expose fundamental deductive components (Section 2, PDF p. 3). The generated instances can still contain implementation or dataset assumptions; the paper does not prove the benchmark generators correct.

## technique 2: iterative LLM self-verification (LLM+LLM)

What it is. The same model generates an answer, receives a separate verification prompt containing that answer, and then receives a backprompt containing the critique and the full interaction history. The exact procedure is: “(1) The instance is processed by a simple, hard-coded natural language translator into a prompt which is then sent to the LLM. (2) The LLM’s response is wrapped in a domain-specific critique prompt, which is separately sent as another LLM query. (3) If the following response claims that the proposed solution is correct, we stop the system and output the proposed solution. If it doesn’t, the critique is extracted, wrapped in instruction text, and appended to a prompt containing the entire history of interactions so far.” (Section 4, PDF p. 6.) The cycle ends on acceptance or timeout.

When to use it. This is the paper's baseline for testing self-critique claims, not a recommended reliability mechanism. It is useful when reproducing or falsifying a proposed self-correction architecture.

How to do it.
1. Translate the formal instance into a natural-language generation prompt (Section 4).
2. Ask the LLM for a candidate solution (Section 4).
3. Wrap the candidate in a domain-specific verification prompt and ask the same LLM for a binary judgment and critique (Section 4).
4. Stop if the model says correct; otherwise append the critique and complete history to a new generation prompt (Section 4).
5. Impose a fixed timeout or maximum number of rounds (Sections 4–5).

Verus form. Inference: a Verus-backed implementation would keep this loop outside the proof, call the model to produce candidate Rust or proof text, compile and verify each candidate with Verus, and feed only checker output back to the model. A self-verifier implemented as another model call cannot establish a Verus postcondition. Inference: the Verus checker must be the acceptance condition; model claims can be logged as untrusted suggestions.

Evidence. Across 100 instances per domain, full self-critique lowers accuracy in Game of 24 (3% versus 5% standard), graph coloring (2% versus 16%), and Mystery Blocksworld (0% versus 4%); Blocksworld rises from 40% to 55% (Table 1, Section 5, PDF p. 7). The authors attribute the collapse to false negatives and later worse generations: “In effect, the system rejects most answers and then times out on a set of later, worse generations.” (Section 5, PDF p. 8.) Table 2 reports verifier accuracy and denominators: Game of 24 87.0% (3567/4100), graph coloring 72.4% (362/500), Blocksworld 71.8% (359/500), and Mystery Blocksworld 79.6% (398/500). False-negative rates are 20.7% (213/1029), 95.8% (113/118), 15.48% (24/155), and 97.09% (100/103), respectively (Table 2, PDF p. 8).

Limits and assumptions. These numbers are GPT-4 results for the prompts and domains in the paper. They do not establish that every LLM self-critique system fails. The LLM verifier also produces false positives, accepting incorrect answers, and free-form critiques can add errors (Section 5.1, PDF p. 9).

## technique 3: external sound verifier with graded feedback

What it is. Replace the model verifier with a task-specific checker whose acceptance decision is sound, then vary how much checker feedback reaches the generator. The paper compares binary feedback (“the previous answer was wrong”), first-error feedback, and all-errors feedback (Section 5.2, PDF pp. 9–10). Domain checkers are concrete: SymPy simplifies Game of 24 expressions; a Python loop checks every graph edge; VAL simulates STRIPS actions and checks preconditions and goal reachability (Sections 3.1–3.3, PDF pp. 5–6).

When to use it. Use this pattern when a candidate has an executable or formally proved validity predicate. Rich feedback is optional; sound acceptance is the essential property in these experiments.

How to do it.
1. Generate a candidate with the LLM (Section 4).
2. Run the sound checker. For planning, execute the action sequence from the initial state and check preconditions and the final goal; for coloring, reject any same-colored edge; for arithmetic, simplify and compare with 24 (Section 3, PDF pp. 5–6).
3. If valid, return the candidate. If invalid, send either no detail, the first detected error, or every detected error (Section 5.2).
4. Repeat until acceptance or timeout (Section 4).

Verus form. Inference: make the checker a Verus-verified function or proof-backed specification. A candidate function can carry `requires` and `ensures`; a proof function can establish loop invariants and the checker can return only after Verus verifies the obligations. For a generated Rust function, compile and run `verus`; accept the artifact only when verification succeeds. Inference: the model's critique text should not be trusted as a proof. The trusted base still includes the Verus toolchain, solver, specifications, and any external code contracts, as described in the Verus notes.

Evidence. Sound feedback improves all four Table 1 domains. First-error feedback reaches 38% Game of 24, 37% graph coloring, 87% Blocksworld, and 8% Mystery Blocksworld; all-error feedback reaches 34% graph coloring, 83% Blocksworld, and 6% Mystery Blocksworld (100 instances per domain, Table 1, PDF p. 7). The paper states, “When we replace the LLM verifier with a sound verifier, every correct answer will be accepted properly.” (Section 5, PDF p. 8.)

The amount of feedback does not consistently explain the gain. The authors report “very little difference between these three conditions” and observe decreases when feedback is increased in two domains (Section 5.2, PDF p. 10). This means the reported improvement is associated with sound rejection, not necessarily with a detailed repair message.

Limits and assumptions. Soundness is only as good as the checker and its model of the task. The paper uses simple domains and does not show that a natural-language critique is itself correct. A checker can reject a valid candidate if its implementation is wrong, although the paper's intended checkers are treated as sound.

## technique 4: verifier-gated repeated sampling without critique

What it is. Keep the sound verifier but remove history and critique. Ask the same base prompt repeatedly, independently, and stop when a candidate passes. The paper says, “The LLM (at t = 1) is asked the same question over and over until the verifier certifies it or it hits some pre-established timeout.” (Section 5.2, PDF p. 10.)

When to use it. Use this simpler architecture when candidate generation is stochastic and a cheap sound checker can test each candidate. It avoids trusting model-generated explanations and keeps prompt size bounded.

How to do it.
1. Send the unchanged base prompt to the LLM k times (Section 5.2).
2. Run the sound verifier on each response (Section 5.2).
3. Return the first accepted response; otherwise report timeout or failure (Section 5.2).
4. Increase k when the verifier and generation budget permit. The paper notes that removing growing history makes prompt token cost “quadratically lower” (Section 5.2, PDF p. 10).

Verus form. Inference: generate multiple Rust/proof candidates, invoke Verus on each in an isolated build, and return the first candidate whose stated contracts verify. Keep a deterministic artifact hash and verifier version with the accepted candidate. Inference: this is a candidate-search wrapper around Verus, not a new proof rule; the guarantee comes from Verus's checked obligations and the chosen specification.

Evidence. Sampling with k = 15 and k = 25 gives Game of 24 28% and 42%, graph coloring 40% and 44%, Blocksworld 68% and 72%, and Mystery Blocksworld 9% and 14% (100 instances per domain, Table 1, PDF p. 7). Self-consistency, which chooses the most common answer from 15 samples, gives 6%, 14%, 42%, and 4% respectively, so majority vote does not reproduce verifier gating (Table 1). The authors conclude, “good performance can be achieved without any critique whatsoever: just let the LLM make many guesses, and have a sound verifier pick any that is actually correct.” (Section 6, PDF p. 10.)

Limits and assumptions. Repeated sampling trades model calls and latency for a higher chance of finding a valid candidate. It cannot help when the generator never emits a valid candidate, when the checker is incomplete, or when the specification is wrong. The reported k values and gains are specific to GPT-4, the four domains, and a 15-round timeout.

## what is proved, measured, and trusted

The paper measures empirical accuracy, false-positive and false-negative rates, and critique accuracy. It does not prove that GPT-4 reasons correctly. Its soundness claims concern the external task checkers and the formal task definitions, not the LLM. The experiments use 100 generation instances per domain (Table 1) and larger verification sets with explicit fractions (Table 2). The paper's key inference is that model verification errors compound over rounds; the direct evidence is the measured collapse and the high false-negative fractions.

Inference: in a VeruLaw product, the strongest product threat identified here is accepting model-authored proof text because the model says it is correct. A Verus run can reject an invalid proof, but a passing proof still depends on the specification, trusted libraries, solver behavior, erasure, compiler, and environment. Inference: the safer design is to treat the agent as a proposal generator and require an independently rerun Verus check before release. The paper's results support this architecture at the level of verifier soundness, but they do not quantify risks from generated Rust, dependency changes, or specification mistakes.

## what VL should not redo

Inference: VL should not spend product effort on an LLM self-critique loop whose acceptance signal is another unconstrained LLM judgment. This paper already measures the failure mode and supplies the relevant baselines. VL should instead invest in reliable Verus invocation, candidate isolation, checker diagnostics, and repeated verifier-gated search. The paper does not test Verus-specific proof repair, so those remain open engineering questions.

## techniques for the catalog

- formal checker benchmark design — generate varied instances with machine-verifiable validity and avoid memorized or tiny answer spaces
- LLM self-verification loop — alternate generation, model verification, and critique-conditioned regeneration, with a timeout
- sound external verification — run a task-specific checker and accept only when its validity predicate passes
- graded verifier feedback — compare no detail, first error, and all errors while holding the sound decision fixed
- verifier-gated sampling — repeatedly query the unchanged prompt and return the first candidate accepted by the sound checker
- verifier error accounting — report accuracy, false-positive rate, and false-negative rate with explicit numerators and denominators

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
