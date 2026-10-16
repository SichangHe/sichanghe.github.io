# Characterizing and Bridging the Diagnostic Gap in eBPF Verifier Rejections
(authored by agents unless marked 🧑)
Tag: `zheng2026characterizing`, [paper](https://arxiv.org/abs/2607.02748)

## what the paper proves or measures
The paper studies 235 reproduced eBPF verifier rejections. 191 are source bugs and 44 reject correct source because of compiler (18), environment (14), or verifier (12) issues. The 191 bugs occupy 12 root-cause categories; ten categories are eBPF-specific. The abstract reports: "Current models achieve 0–37% one-shot success with the raw log" (Abstract, p. 1). The authors report that 47% of all rejections carry only EINVAL and that one normalized terminal message spans nine categories (Section 2.3–2.4, PDF pp. 2–3). Their artifact, bpfix, is about 23,000 lines of Rust and consumes an existing level-2 verifier log (Section 3.1, p. 3).

## technique: reconstruct the lost verifier proof
What it is. bpfix turns a terminal verifier symptom into a proof-oriented diagnostic. The paper states: “bpfix reconstructs where the required proof was established and where it was lost from the verifier log, and prints a Rust-like diagnostic” (Abstract, p. 1).

When to use it. Use it when a verifier log names the instruction where checking stopped but not the earlier instruction that destroyed pointer provenance, bounds, nullness, a reference lifetime, or a scalar range. The authors explain that “The terminal error names the rejection location, the operation where verification stopped, which the verifier reaches only after the program lost the proof at an earlier instruction” (Section 2.1, p. 2).

How to do it.
1. Rebuild the rejection under one fixed toolchain, collecting per-instruction abstract states. Their empirical dataset rebuilt 936 reports with kernel 6.15.11 and clang 18 at log level 2; 235 rejected under that build (Section 2.2, p. 2)
2. Parse the terminal error and normalize registers and offsets into a stable evidence stream (Section 3.1, p. 3)
3. Map the symptom and nearby state to a proof family, required proof, register, access size/offset, pointer type, range, or reference identifier (Section 3.2, p. 4)
4. Scan states for establishment, incompatibility, and later rejection. When establishment and loss are both visible, report the transition as the loss point (Section 3.2, p. 4)
5. Emit an error id, class, confidence, source span, verifier line, required proof, and next action. If no evidence was established, recommend a check or acquisition; if evidence was lost, recommend preserving or re-deriving it (Section 3.3, p. 4)

The running packet example records R5 as `pkt(off=34,r=42)` and later as scalar 40 before a rejected load; bpfix therefore points to the pointer-to-scalar transition and asks the developer to reacquire a verifier-tracked pointer (Section 3.2, p. 4). A map example distinguishes an invalid cast of `&globals` from the repair using `bpf_map_lookup_elem`, a null check, and a write through the returned value pointer (Figure 4, p. 4).

Verus form. Inference: model each proof obligation as a Rust/Verus predicate such as a bounds or pointer-provenance `spec fn`; put state assumptions in `requires`, preservation facts in loop `invariant` declarations, and repair lemmas in `proof fn`s with `ensures`. Inference: a diagnostic pass can track ghost facts through a sequence of abstract states and point to the first failed `assert`, but this is a tool around Verus rather than a Verus construct. Inference: Verus ownership and borrowing already reject many alias errors, while eBPF packet bounds and helper contracts need explicit specifications; the paper’s eBPF register states do not automatically become Verus facts.

Evidence and limits. bpfix-bench has 75 tasks: 40 required-proof tasks and 35 minimized from Cilium, xdp-tools, and bpftime. A candidate is accepted only if it loads through the kernel verifier and passes functional and source-semantics tests (Section 5.1, p. 5). With raw logs, Qwen3.6 27B repairs 22/75; with bpfix it repairs 38/75. GLM 5.2 improves 28/75 to 38/75, and Qwen2.5 3B improves 0/75 to 8/75 (one-shot, Figure 6, p. 6). The retry counts are 30/75 to 44/75 for Qwen3.6, 47/75 to 52/75 for GLM, and 0/75 to 10/75 for Qwen2.5. Load failures for Qwen3.6 fall from 19/75 to 10/75; source-semantics failures fall from 22/75 to 16/75 (Table 3, p. 6). These denominators are the 75 benchmark tasks and the models are run at temperature zero.

## techniques for the catalog
- proof-lifecycle localization — reconstruct establishment, loss, and required evidence from per-instruction checker states
- evidence-aware diagnostics — emit source spans, proof obligations, confidence, and a concrete re-establishment action
- layer attribution — separate source bugs from compiler-lowering, environment, and verifier causes sharing one terminal message
- verifier-gated repair benchmarking — accept an LLM patch only after independent load, functional, and source-semantics checks
