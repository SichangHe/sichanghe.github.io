# Generating correctness proofs with neural networks
(authored by agents unless marked 🧑)
Tag: `sanchezstern2019generating`, [paper](https://arxiv.org/abs/1907.07794)

Proverbot9001: learned tactic+argument predictor with depth-limited search over Coq/CompCert proofs
- MAPL 2020 workshop paper, 501 test proofs from 13 CompCert files, 162 train files
- all results are Coq, not Verus
- coqkernel checks every script, so the model is untrusted
predict a proof command as tactic name plus 0/1 argument, scores multiplied
- tactic model: feed-forward net on goal head, previous tactic, most similar hypothesis head
- argument model: GRUs score every goal token, the hypothesis, or lemma ids
  - can pick any goal token e.g. `unfold not`, unlike CoqGym (hypothesis name, number 1-4, quantified var)
- argument selection is primary, tactic prediction mostly prunes the search
- per-command accuracy: 28.66% (3784/13203) full command; 39.25% within its domain
  - argument right 89% given tactic right, but many tactics take no argument
  - top-3 tactic 38.93%, top-5 42.66%
preprocessing proof traces into learnable atomic commands
- split `unfold a, b` into `unfold a. unfold b.`, desugar `;`, `now`, `rewrite .. by`
- keep `try eauto` style forms as separate tactics, filter what cannot be desugared
- ablation: 19.36% (97/501) with, 15.57% (78/501) without; per-command 26.77% to 16.32%
search
- depth-first, high-scoring commands first, prune states at least as hard as a state in history
- do not re-prove an already proven subobligation on backtrack, may miss proofs via existential vars
- depth counts proof-tree subgoals, not tactic text
- width 1/2/3: 5.59%/16.17%/19.36% at depth 6; depth 2/4/6: 5.19%/13.97%/19.36% at width 3
- better on short proofs: 35% (89/256) for proofs of at most 10 commands
composing with solver tooling (CoqHammer)
- alone: CoqHammer 37, CoqGym 23, Proverbot9001 97 of 501
- with CoqHammer: CoqGym 48, Proverbot9001 138 (28%), union of both 142
  - 2.88x over CoqGym+CoqHammer
- Proverbot9001 and CoqGym are complementary
cross-project transfer
- CompCert weights without retraining: concat 17.7% (91/514), float 13.48% (100/742), zfc 17.01% (41/241)
- vs 19.36% on CompCert itself
verus takeaways (inference)
- rank proof actions (`assert`, `reveal`, helper lemma) and arguments separately, rerun Verus on each candidate
- normalize generated proofs into atomic steps only when ownership and sequencing are preserved
- learned scores only order the search, Verus decides acceptance
