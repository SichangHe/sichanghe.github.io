# On the Self-Verification Limitations of Large Language Models on Reasoning and Planning Tasks
(authored by agents unless marked 🧑)
Tag: `stechly2024selfverification`, [paper](https://arxiv.org/abs/2402.08115)

## scope and result

The paper tests whether an LLM can verify and repair its own answers on formally checkable tasks. Its abstract states: “We observe significant performance collapse with self-critique and significant performance gains with sound external verification.” (Abstract, PDF p. 1.) The authors use GPT-4 on Game of 24, graph coloring, and STRIPS planning, where a proposed answer has a machine-checkable correctness condition (Sections 1 and 3, PDF pp. 1–5).

The central experimental decomposition has three roles: answer generation, binary verification, and critique generation. The method says, “Though only two types of prompts are sent, the LLM can be seen as playing three separate roles: as an answer guesser, a (binary) verifier, and a critique generator.” (Section 4, PDF p. 6.) The authors then replace or remove these roles one at a time to identify which component changes performance.

## technique 1: choose independently checkable tasks with varied instances

What it is. The evaluation domain is selected so instances can be generated or varied, answers have many possible solutions, and an executable checker can decide correctness. The authors reject benchmarks whose answers are only judged by another model or by human taste. Their stated reason is that “it is crucial to test them on formal tasks–ones where machine-verifiable ground truths are available for both generation and criticism.” (Section 1, PDF p. 2.) They also require arbitrary generation to reduce memorization risk and avoid multiple-choice spaces where repeated guessing trivially enumerates options (Section 2, PDF pp. 3–4).

When to use it. Inference: use this design when measuring an agent's verification or self-correction, especially when a language-model judge could share the same errors as the generator.

How to do it.
1. Define a problem representation and an exact predicate for a valid answer (Sections 1–3, PDF pp. 2–5).
2. Generate instances with controllable variation and retain their machine-computed ground truth. For graph coloring, the authors build 100 planar graphs with a variant of the Erdős–Rényi method at p = 0.4, discard non-planar or duplicate graphs, and store DIMACS graphs with a precomputed chromatic number (Section 3.2, PDF p. 5).
3. Ensure the answer space is not reduced to a small set of exclusive guesses. The paper explicitly requires “a large number of potential solutions” (Section 3, PDF p. 4).
4. Evaluate generation and verification on separate instance ranges when useful. Game of 24 generation uses instances 901–1000, while verification-only experiments use instances 1–1000 (Section 3.1, PDF p. 5).

Verus form. Inference: represent each benchmark instance as an executable Rust value and write a Verus specification predicate for validity. For a graph coloring, a `spec fn` can state that every edge's endpoints have different colors; a proof function can establish the predicate for a generated coloring. Keep the checker executable if it will perform a prerequisite check on generated code at run time, and separately prove correspondence between the checker and the specification. Inference: Verus does not itself provide random graph generation or a benchmark harness; those remain ordinary Rust infrastructure and trusted data-generation code.

Evidence. The paper evaluates 100 instances per domain in Table 1 (Section 5, PDF p. 7) and uses sound executable checkers described in Section 3. Game of 24 is checked with SymPy simplification; graph coloring checks each edge; STRIPS plans are checked with VAL (Section 3, PDF pp. 5–6).

Limits and assumptions. The authors note that formal tasks are narrower than ordinary language tasks, although they argue they expose fundamental deductive components (Section 2, PDF p. 3). Inference: benchmark generators and datasets remain possible sources of error; this paper does not prove the generators correct.

## technique 2: iterative LLM self-verification (LLM+LLM)

What it is. The same model generates an answer, receives a separate verification prompt containing that answer, and then receives a backprompt containing the critique and the full interaction history. The exact procedure is: “(1) The instance is processed by a simple, hard-coded natural language translator into a prompt which is then sent to the LLM. (2) The LLM’s response is wrapped in a domain-specific critique prompt, which is separately sent as another LLM query. (3) If the following response claims that the proposed solution is correct, we stop the system and output the proposed solution. If it doesn’t, the critique is extracted, wrapped in instruction text, and appended to a prompt containing the entire history of interactions so far.” (Section 4, PDF p. 6.) The cycle ends on acceptance or timeout.

When to use it. The authors test this architecture against standard prompting. Inference: use it to reproduce or test self-correction claims, rather than as a reliability mechanism.

How to do it.
1. Translate the formal instance into a natural-language generation prompt (Section 4).
2. Ask the LLM for a candidate solution (Section 4).
3. Wrap the candidate in a domain-specific verification prompt and ask the same LLM for a binary judgment and critique (Section 4).
4. Stop if the model says correct; otherwise append the critique and complete history to a new generation prompt (Section 4).
5. Impose a fixed timeout or maximum number of rounds (Sections 4–5).

Verus form. Inference: a Verus-backed implementation would keep this loop outside the proof, call the model to produce candidate Rust or proof text, compile and verify each candidate with Verus, and feed only checker output back to the model. A self-verifier implemented as another model call cannot establish a Verus postcondition. Inference: the Verus checker must be the acceptance condition; model claims can be logged as untrusted suggestions.

Evidence. Across 100 instances per domain, full self-critique lowers accuracy in Game of 24 (3% versus 5% standard), graph coloring (2% versus 16%), and Mystery Blocksworld (0% versus 4%); Blocksworld rises from 40% to 55% (Table 1, Section 5, PDF p. 7). The authors attribute the collapse to false negatives and later worse generations: “In effect, the system rejects most answers and then times out on a set of later, worse generations.” (Section 5, PDF p. 7.) Table 2 reports verifier accuracy and denominators: Game of 24 87.0% (3567/4100), graph coloring 72.4% (362/500), Blocksworld 71.8% (359/500), and Mystery Blocksworld 79.6% (398/500). False-negative rates are 20.7% (213/1029), 95.8% (113/118), 15.48% (24/155), and 97.09% (100/103), respectively (Table 2, PDF p. 8).

Limits and assumptions. These numbers are GPT-4 results for the prompts and domains in the paper. They do not establish that every LLM self-critique system fails. The LLM verifier also produces false positives, accepting incorrect answers, and free-form critiques can add errors (Section 5.1, PDF p. 8). Appendix A.1 also tests chain-of-thought verification: Game of 24 reaches 32% in the full loop, compared with 3% for the original LLM+LLM loop and 38% for sound first-error feedback (Table A1, PDF p. 14). Thus the original prompt results do not cover all verification prompts.

## technique 3: external sound verifier with graded feedback

What it is. Replace the model verifier with a task-specific checker whose acceptance decision is sound, then vary how much checker feedback reaches the generator. The paper compares binary feedback (“the previous answer was wrong”), first-error feedback, and all-errors feedback (Section 5.2, PDF pp. 8–9). Domain checkers are concrete: SymPy simplifies Game of 24 expressions; a Python loop checks every graph edge; VAL simulates STRIPS actions and checks preconditions and goal reachability (Sections 3.1–3.3, PDF pp. 5–6).

When to use it. Inference: use this pattern when a candidate has an independently checkable validity predicate. Feedback detail has uneven effects here: in Blocksworld, binary feedback reaches 60%, first-error feedback 87%, and all-error feedback 83% (Table 1, PDF p. 7).

How to do it.
1. Generate a candidate with the LLM (Section 4).
2. Run the sound checker. For planning, execute the action sequence from the initial state and check preconditions and the final goal; for coloring, reject any same-colored edge; for arithmetic, check the required numbers and their multiplicities, handle malformed expressions, and simplify and compare with 24 (Section 3, PDF pp. 5–6; Appendix A.3.3, PDF p. 17).
3. If valid, return the candidate. If invalid, send either no detail, the first detected error, or every detected error (Section 5.2).
4. Repeat until acceptance or timeout (Section 4).

Verus form. Inference: make the checker a Verus-verified function or proof-backed specification. A candidate function can carry `requires` and `ensures`; a proof function can establish loop invariants and the checker can return only after Verus verifies the obligations. For a generated Rust function, compile and run `verus`; accept the artifact only when verification succeeds. Inference: the model's critique text should not be trusted as a proof. Inference: this design would still depend on the Verus toolchain, solver, specifications, and any external code contracts; the paper does not study these dependencies.

Evidence. Sound feedback improves all four Table 1 domains. First-error feedback reaches 38% Game of 24, 37% graph coloring, 87% Blocksworld, and 8% Mystery Blocksworld; all-error feedback reaches 34% graph coloring, 83% Blocksworld, and 6% Mystery Blocksworld (100 instances per domain, Table 1, PDF p. 7). The paper states, “When we replace the LLM verifier with a sound verifier, every correct answer will be accepted properly.” (Section 5, PDF p. 7.)

The amount of feedback does not consistently explain the gain. The authors report “very little difference between these three conditions” and observe decreases when feedback is increased in two domains (Section 5.2, PDF p. 9). Inference: these results support testing sound acceptance separately from the value of detailed repair messages; they do not show that feedback detail never helps.

Limits and assumptions. The paper treats its external checkers as sound and compares LLM critiques with their outputs (Sections 3–5). Inference: transferring this architecture requires checking the external checker's implementation and task model; the experiments do not establish the soundness of a new checker.

## technique 4: repeated sampling with sound verification and no critique

What it is. Keep the sound verifier but remove history and critique. Ask the same base prompt repeatedly at temperature 1, and stop when a candidate passes. The paper says, “The LLM (at t = 1) is asked the same question over and over until the verifier certifies it or it hits some pre-established timeout.” (Section 5.2, PDF p. 9.)

When to use it. Inference: use this simpler architecture when candidate generation is stochastic and a cheap sound checker can test each candidate. It avoids trusting model-generated explanations and keeps prompt size bounded.

How to do it.
1. Send the unchanged base prompt to the LLM up to k times, stopping on acceptance (Section 5.2).
2. Run the sound verifier on each response (Section 5.2).
3. Return the first accepted response; otherwise report timeout or failure (Section 5.2).
4. Increase k when the verifier and generation budget permit. The paper notes that removing growing history makes prompt token cost “quadratically lower” (Section 5.2, PDF p. 9).

Verus form. Inference: generate multiple Rust/proof candidates, invoke Verus on each in an isolated build, and return the first candidate whose stated contracts verify. Keep a deterministic artifact hash and verifier version with the accepted candidate. Inference: this is a candidate-search wrapper around Verus, not a new proof rule; the guarantee comes from Verus's checked obligations and the chosen specification.

Evidence. Sampling with k = 15 and k = 25 gives Game of 24 28% and 42%, graph coloring 40% and 44%, Blocksworld 68% and 72%, and Mystery Blocksworld 9% and 14% (100 instances per domain, Table 1, PDF p. 7). Self-consistency, which chooses the most common answer from 15 samples, gives 6%, 14%, 42%, and 4% respectively, so selecting the most common answer does not reproduce the gains from sound verification (Table 1). The authors conclude, “good performance can be achieved without any critique whatsoever: just let the LLM make many guesses, and have a sound verifier pick any that is actually correct.” (Section 6, PDF p. 9.)

Limits and assumptions. Inference: repeated sampling uses more model calls to improve the chance of finding a valid candidate; success still requires generation and acceptance of one. The reported sampling results use GPT-4 and budgets of 15 or 25 samples; the feedback loops use a 15-round limit (Table 1 and Section 5, PDF pp. 7–8). Appendix A.2 reports 70% on Game of 24 with 150 direct queries and sound verification, compared with Tree of Thoughts' reported 74% (PDF p. 15); the authors compare query budgets approximately through cost.

## what is proved, measured, and trusted

The paper measures empirical accuracy, false-positive and false-negative rates, and critique accuracy. It does not prove that GPT-4 reasons correctly. Its soundness claims concern the external task checkers and the formal task definitions, not the LLM. The experiments use 100 generation instances per domain (Table 1) and larger verification sets with explicit fractions (Table 2). The paper's key inference is that model verification errors compound over rounds; the direct evidence is the measured collapse and the high false-negative fractions.

## techniques for the catalog

- formal checker benchmark design — generate varied instances with machine-verifiable validity and avoid memorized or tiny answer spaces
- LLM self-verification loop — alternate generation, model verification, and critique-conditioned regeneration, with a timeout
- sound external verification — run a task-specific checker and accept only when its validity predicate passes
- graded verifier feedback — compare no detail, first error, and all errors while holding the sound decision fixed
- sampling with sound verification — repeatedly query the unchanged prompt and return the first candidate accepted by the sound checker
- verifier error accounting — report accuracy, false-positive rate, and false-negative rate with explicit numerators and denominators
