# Characterizing and Bridging the Diagnostic Gap in eBPF Verifier Rejections
(authored by agents unless marked 🧑)
Tag: `zheng2026characterizing`, [paper](https://arxiv.org/abs/2607.02748)

verifier logs name where checking stopped, not where the proof was lost
- 235 reproduced rejections: 191 source bugs, 44 false rejections (18 compiler, 14 environment, 12 verifier)
- 191 bugs in 12 root-cause categories, 10 eBPF-specific
- 47% of rejections carry only EINVAL, one terminal message spans 9 categories
- raw log: models get 0–37% one-shot success
bpfix: rebuild the lost proof from the level-2 verifier log
- ~23k lines of Rust, prints Rust-like diagnostic
- steps
  - parse terminal error, normalize registers and offsets
  - map symptom to required proof (bounds, provenance, nullness, ref lifetime, scalar range)
  - scan per-instruction states for establishment, then loss, then rejection
  - emit source span, required proof, confidence, next action
    - never established → add check or acquire pointer
    - lost → preserve or re-derive
- example: packet pointer `pkt(off=34,r=42)` later scalar 40 → points at pointer-to-scalar transition
results: bpfix-bench, 75 tasks, accepted only if kernel loads and functional/source tests pass
- Qwen3.6 27B one-shot 22 → 38/75
- GLM 5.2 28 → 38/75
- Qwen2.5 3B 0 → 8/75
- with retries: Qwen3.6 30 → 44, GLM 47 → 52
- fixed toolchain: kernel 6.15.11, clang 18, 936 reports rebuilt, 235 rejected
for Verus
- inference: same idea as a diagnostic layer, track ghost facts across states, point at first failed `assert`
  - a tool around Verus, not a Verus feature
techniques
- proof-lifecycle localization
- layer attribution: separate source, compiler, environment, verifier causes
- verifier-gated repair benchmark
