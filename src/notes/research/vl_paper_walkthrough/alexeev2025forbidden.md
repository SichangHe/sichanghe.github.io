# Forbidden Sidon subsets of perfect difference sets, featuring a human-assisted proof
(authored by agents unless marked 🧑)
Tag: `alexeev2025forbidden`, [paper](http://arxiv.org/abs/2510.19804v2)

## result and formalization setting

Alexeev and Mixon disprove Erdős's extension conjecture with the Sidon set `{1, 2, 4, 8, 13}` and formalize the counterexample in Lean. They also formalize Hall's earlier counterexample. The abstract says: “We establish that {1, 2, 4, 8, 13} is a counterexample to this conjecture.” (Abstract, PDF p. 1) The authors say the resulting Lean proof is thousands of lines “nearly all of which were written by ChatGPT” (Section 1, PDF p. 4), that they “did carefully check that our statement matched what we believed we were proving” (Section 6, p. 10), and that LLMs were not much help with the mathematics itself (Section 7, p. 12).

## technique: human–LLM–proof-assistant loop

Use this when a human has the mathematical argument but does not know the proof assistant syntax. The paper's idealized loop is:

1. The human discusses the argument with an LLM in natural language (Section 7, PDF p. 12).
2. The LLM translates the core ideas into Lean and works through syntax and compiler errors (Section 7, p. 12).
3. When a fundamental logical step blocks progress, the LLM asks the human a focused follow-up (Section 7, p. 12).
4. Repeat until the formal backend accepts the proof (Section 7, p. 12).
5. Keep the proof assistant as the acceptance check, even if generated code is ugly or long (Section 6, p. 9).

The authors characterize their experience directly: “What we experienced was much more like a human-assisted (formal) proof.” (Section 7, PDF p. 12) They also state the key safety condition: “Lean is a proof assistant that formally verifies arguments, and so we can be sure that the argument is correct even if its code is ugly.” (Section 6, p. 9) The next sentence limits that assurance: “the statement that Lean verifies may not correspond properly to the statement that the human mathematician believes is being proven.” (Section 6, p. 9)

Verus form (Inference): use a human-approved Rust/Verus contract as the frozen target, let an LLM edit function bodies, `assert` hints, loop `invariant`s, and `proof fn` helpers, and run Verus after each iteration. Keep human review focused on whether `requires`/`ensures` encode the intended theorem. Verus proof acceptance does not repair a wrong specification, just as Lean did not detect the paper's accidental modulus-zero statement.

## technique: specification consistency checks

Use independent lemmas to detect translation errors before trusting a large generated proof. The authors found that their imported Lean statement accidentally allowed `v = 0`, turning the finite conjecture into an infinite case with the opposite answer (Section 6, PDF p. 10). They then checked the statement against their intent and proved Observations 2 and 6 as “consistency checks” not needed for the main proof (Section 6, p. 10). Their Lean definition explicitly adds `v ≠ 0` in `erdos_707`, and the final theorem is `¬ erdos_707` (Section 6, pp. 10–11).

Verus form (Inference): state small independent `proof fn` lemmas for datatype equivalences and boundary conditions, and assert that a contract excludes degenerate inputs. For a modulus-like parameter, require nonzero values explicitly. Compare the executable theorem statement, generated proof obligations, and human prose before filing a result.

## technique: compiler-backed generation with version pins

The supplementary file records Lean 4.24.0 and a specific Mathlib commit (Section 6, PDF p. 10). The generated proof has over 6,000 lines, 26 definitions, 169 lemmas, and four final counterexample theorems; an ordinary laptop verifies it in slightly under half a minute (Section 6, p. 11). The denominator is one formalization on that laptop and toolchain, not a benchmark average. A basic fixed-point-free involution claim consumed over 250 lines even though it is one informal sentence (Section 6, p. 11; Section 7, p. 12).

The authors report about a week of full-time work with substantial overtime, or about a month of calendar time (Section 7, footnote 5, PDF p. 12). They report recurring difficulty with the multitude of cardinality notions in Mathlib (Section 7, p. 12) and with parity, which they guess comes from the model being trained heavily on the earlier mathlib3 (Section 7, p. 13). Inference: VL should pin the Verus and dependency versions, expose compiler diagnostics to the agent, and measure proof repair time and proof-to-specification size rather than assuming generated code is efficient.

## technique: separate exploratory code from trusted proof

The authors call exploratory code “almost an ideal use case” for LLMs, though the first author instead wrote that code by hand using Construction 15 (Section 7, PDF p. 11). They found the model unable to help close the central mathematical gap even after they knew what to prove (Section 7, p. 12). Formal checking changed the role of generated output: the proof assistant, not the LLM's explanation, decides acceptance. The paper names the theorem statement as the remaining source of error (Section 6, p. 9). Inference: the trust boundary also includes imported libraries, the kernel, the compiler/toolchain, and human interpretation. Lean's printed axioms for `not_erdos_707AM` are `[propext, Classical.choice, Quot.sound]` (Section 6, p. 11); these are the paper's reported dependencies.

Inference: in agent-written verified Rust, a passing Verus run lowers implementation risk but leaves specification, trusted external specifications, solver, erasure, and Rust compiler assumptions. The threat is moderate: LLM syntax and proof repair can save substantial labor, but a wrong contract can produce a formally valid result about the wrong behavior.

## already done and product implications

The paper already demonstrates human-assisted proof generation, consistency checks for formal statements, version-pinned compilation, and quantitative proof-size/time reporting. Inference: VL should reuse these patterns and avoid claiming novelty for an LLM-plus-proof-assistant loop alone. The unresolved opportunity is a controlled Verus study that measures contract errors, repair iterations, dependency drift, and independently reviewed specifications.

## techniques for the catalog

- human–LLM–verifier loop — discuss a proof in natural language, generate assistant code, repair compiler failures, and accept only a checked result
- consistency checks — prove independent small lemmas and reject degenerate formal statements before trusting the main theorem
- version-pinned compilation — record toolchain and library versions and report proof size, definitions, lemmas, and verification time with denominators
- trusted-boundary review — inspect the theorem statement, libraries, kernel or verifier, compiler, and external assumptions separately from generated code
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We mention all of this background because perfect difference sets correspond to cyclic projective planes."): read the paper text start to end and the whole study; checked every quotation, the Lean size, time and version figures, the Lean statement and v = 0 flaw, the paper's idealized loop steps, and section and page references; changed the page references for the 250-line involution (p. 12), the week of work (p. 12) and the cardinality and parity difficulties (pp. 12-13), replaced the unsupported claims that the result is independent of the LLM and that the model was useful for formalization-adjacent exploratory work with what the paper says, labelled the trust-boundary extension and the product recommendations as Inference; kept the arXiv link (matches arXiv:2510.19804v2 in the paper). Not checked: the mathematical proofs in Sections 3-5, the Lean supplementary file, and the cited references.
