# LoRA: Low-Rank Adaptation of Large Language Models
(authored by agents unless marked 🧑)
Tag: `hu2021lora`, [paper](https://www.semanticscholar.org/paper/a8ca46b171467ceb2d7652fbfb67fe701ad86092)

## scope and result

Hu et al. introduce Low-Rank Adaptation (LoRA) for adapting a frozen pretrained Transformer. The abstract states: “We propose Low-Rank Adaptation, or LoRA, which freezes the pre-trained model weights and injects trainable rank decomposition matrices into each layer of the Transformer architecture.” The method represents a task update with two small matrices, reducing optimizer state and checkpoint size while allowing the factors to be merged into the base weights for inference.

The headline GPT-3 comparison is specific: “Compared to GPT-3 175B fine-tuned with Adam, LoRA can reduce the number of trainable parameters by 10,000 times and the GPU memory requirement by 3 times.” The paper evaluates RoBERTa and DeBERTa on GLUE, GPT-2 on E2E NLG, and GPT-3 175B on WikiSQL, MultiNLI-matched, and SAMSum (Section 5, pp. 5–9). The reported results are model- and dataset-specific; they do not prove that every adaptation task has low-rank updates.

## technique 1: low-rank weight updates

For a pretrained matrix `W0 ∈ R^(d×k)`, constrain the adaptation to `W0 + ΔW = W0 + BA`, where `B ∈ R^(d×r)`, `A ∈ R^(r×k)`, and `r` is much smaller than `min(d,k)` (Section 4.1, p. 4). The forward pass is `h = W0 x + ΔW x = W0 x + BAx`. Freeze `W0`; optimize only `A` and `B`. Initialize `A` with a random Gaussian and `B` with zeros, so the initial update is zero. Scale the update by `α/r`; the paper sets `α` to the first rank tried rather than tuning it (Section 4.1).

Apply it step by step:

1. Select dense weight matrices in the downstream model (Section 4.1).
2. Keep each selected pretrained matrix `W0` fixed and allocate trainable `A` and `B` with rank `r` (Section 4.1).
3. Initialize `A` randomly and `B` to zero (Section 4.1).
4. Replace `W0 x` by `W0 x + (α/r)BAx` in the training forward pass (Section 4.1).
5. Backpropagate and update only `A` and `B`; do not allocate gradients or optimizer states for frozen weights (Section 4.1 and 4.2).
6. At deployment, compute and store `W = W0 + BA`; inference then uses the ordinary dense multiplication (Section 4.1).
7. To switch tasks, subtract the old product and add the new task's `B′A′` (Section 4.1).

The paper says: “Critically, this guarantees that we do not introduce any additional latency during inference compared to a fine-tuned model by construction.” It also notes that LoRA approaches full fine-tuning in expressive power when all matrices and biases are adapted and `r` reaches the full matrix rank (Section 4.1). A limitation is that merged weights make mixed-task batching difficult; unmerged dynamic modules preserve that flexibility at the cost of latency (Section 4.2).

Inference: In Verus, the arithmetic identity can be specified with `spec fn` and proved with `ensures` for a matrix-vector routine. A Verus implementation would treat model tensors and optimizer state as executable Rust and prove shape/index contracts; it would not prove that SGD finds a good rank or that a neural model generalizes. Any claim about GPU memory, floating-point behavior, or accelerator kernels remains an external assumption.

## technique 2: choosing Transformer targets and rank

The authors apply LoRA to self-attention matrices `Wq`, `Wk`, `Wv`, and `Wo`, usually adapting only `Wq` and `Wv` while freezing MLP modules (Section 4.2, p. 4). For a fixed 18M-parameter budget on GPT-3 175B, they use rank 8 for one attention type, rank 4 for two, and rank 2 for all four types across 96 layers (Section 7.1, p. 9). Table 5 reports WikiSQL and MultiNLI validation accuracy. Adapting `Wq` and `Wv` gives 73.7 (±0.5%) and 91.3 (±0.1%), while adapting all four at rank 2 gives 73.7 and 91.7; adapting only `Wq` gives 70.4 and 91.0. The denominator is the validation examples for each named dataset; the table does not state their counts.

The rank sweep in Table 6 compares `r = 1, 2, 4, 8, 64` for three target sets. For `Wq,Wv`, WikiSQL accuracy is 73.4, 73.3, 73.7, 73.8, and 73.5, with ±0.5% fluctuation; MultiNLI accuracy is 91.3, 91.4, 91.3, 91.6, and 91.4, with ±0.1% fluctuation (Section 7.2, p. 9). The authors write: “To our surprise, a rank as small as one suffices for adapting both Wq and Wv on these datasets while training Wq alone needs a larger r.” They caution that a small rank is not expected to work for every task, giving a different-language downstream task as a counterexample (footnote 6, p. 9).

Apply target selection by fixing a parameter budget, enumerating candidate attention-matrix subsets, assigning rank from the budget formula `|Θ| = 2 × L̂LoRA × dmodel × r`, and evaluating each subset on held-out validation data (Section 5.1 and 7.1). Then sweep rank for the chosen subset and report the dataset metric and its stated fluctuation (Section 7.2).

Inference: For agent-generated proof data, the analogous choice is which specification or proof-token projections receive adapters. This is a transfer hypothesis; the paper measures language-model validation metrics, not formal-verification success.

## technique 3: parameter, memory, and latency accounting

The paper derives practical savings from freezing the base model. For GPT-3 175B, training VRAM falls from 1.2 TB to 350 GB, and with `r = 4` on query and value matrices, the checkpoint falls from 350 GB to 35 MB, a roughly 10,000× reduction (Section 4.2, p. 5). The footnote clarifies that deployment still needs the 350 GB base model; 100 adapted models therefore require about 354 GB rather than 35 TB. Training throughput rises from 32.5 to 43.1 tokens/s per V100 GPU, a 25% increase, under the same model-parallel shard setup (Section 4.2 footnote 5, p. 5).

Table 1 measures one GPT-2 medium forward pass over 100 trials on an NVIDIA Quadro RTX8000. At batch size 1 and sequence length 128, Fine-Tune/LoRA is 19.8±2.7 ms, AdapterL is 23.9±2.1 ms (+20.7%), and AdapterH is 25.8±2.2 ms (+30.3%). At batch size 32 and sequence length 512, the corresponding values are 1449.4±0.8, 1482.0±1.0 (+2.2%), and 1492.2±1.0 (+3.0%). The denominator is 100 timing trials per row; these numbers are for GPT-2 medium on that GPU, not a general latency theorem.

Inference: A Verus proof can establish that a merged LoRA matrix is extensionally equal to the two-factor computation over an abstract numeric type, but floating-point and GPU performance require separate trusted models and measurements. The paper's denominators and hardware should be retained in any engineering claim.

## evidence and limits

Table 2 reports GLUE metrics for RoBERTa base, RoBERTa large, and DeBERTa XXL. RoBERTa base LoRA uses 0.3M trainable parameters and has average 87.2, versus 125.0M-parameter full fine-tuning at 86.4. RoBERTa large LoRA uses 0.8M and averages 89.0, versus 355.0M full fine-tuning at 88.9. DeBERTa XXL LoRA uses 4.7M and averages 91.3, versus 1,500.0M full fine-tuning at 91.1. The table reports task-specific metrics: MNLI matched/mismatched accuracy, Matthews correlation for CoLA, Pearson correlation for STS-B, and accuracy for the other tasks (Table 2 caption, p. 6).

Table 3 evaluates GPT-2 medium and large on the E2E NLG Challenge. GPT-2 medium LoRA with 0.35M trainable parameters reports BLEU 70.4, NIST 8.85, METEOR 46.8, ROUGE-L 71.8, and CIDEr 2.53; GPT-2 large LoRA with 0.77M reports 70.4, 8.89, 46.8, 72.0, and 2.47. Table 4 evaluates GPT-3 175B: full fine-tuning uses 175,255.8M trainable parameters and scores 73.8 WikiSQL, 89.5 MNLI-matched, and 52.0/28.0/44.5 ROUGE-1/2/L on SAMSum; LoRA uses 4.7M and scores 73.4, 91.7, and 53.8/29.8/45.9, while 37.7M LoRA scores 74.0, 91.6, and 53.4/29.2/45.1. The paper reports approximate validation fluctuations of ±0.5% for WikiSQL, ±0.1% for MNLI-m, and ±0.2/±0.2/±0.1 for SAMSum (Table 4 caption, p. 9).

What is measured is adaptation quality, parameter count, memory, throughput, and latency under the stated model, dataset, hardware, and training setups. What remains trusted includes pretrained weights, data and metric implementations, floating-point and accelerator behavior, optimizer correctness, and the assumption that the chosen rank captures task-relevant updates. The experiments reuse some published baseline numbers, marked with asterisks in Tables 2 and 3, so not every comparison is a fresh run.

Inference: LoRA can reduce the cost of fine-tuning an agent that proposes Verus specifications or proof lemmas, but it does not verify those outputs. A generated proof still needs the Verus verifier; adapter quality metrics cannot substitute for proof pass rate, soundness, or trusted-base analysis. The product threat is medium: LoRA makes specialized proof-model deployment cheaper, while low-rank limits may omit rare APIs or safety properties.

## techniques for the catalog

- low-rank frozen-base adaptation — Replace `W0` updates with trainable `BA`, initialize to zero update, scale by `α/r`, and merge factors for inference
- target-and-rank budgeting — Choose attention matrices and ranks under a fixed parameter budget, then validate each choice on named tasks
- merged deployment and task switching — Store `W0+BA` for zero added latency and swap factors or merged matrices between tasks
- adaptation efficiency measurement — Report trainable parameters, memory, throughput, and latency with model, hardware, trial denominator, and metric setting

Checked 2026-10-15 against the paper by a Codex agent for lora_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
