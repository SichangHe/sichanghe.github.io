# Config2Spec: Mining Network Specifications from Network Configurations
(authored by agents unless marked 🧑)
Tag: `birkner2020config2spec`, [paper](https://www.usenix.org/conference/nsdi20/presentation/birkner)

## scope and result

Config2Spec mines the policies that hold for every concrete environment captured by a configuration and a failure model. The paper states: “Config2Spec is precise: it returns all policies that hold under the failure model (no false negatives) and only those (no false positives).” (§1, p. 969). It combines data-plane analysis, which prunes policies violated by sampled environments, with control-plane verification, which checks policies over the failure model (§3, pp. 972–973).

The policy vocabulary includes reachability, isolation, waypoint traversal, and load balancing on at least two paths (Table 1 and §2, p. 971). The failure model partitions links into fixed-up, fixed-down, and symbolic links; `k` bounds the total number of simultaneously down links, including fixed-down links (§2, p. 971). The system maintains `cands`, a superset of the specification, and `verified`, a subset. Equality means both are the exact specification (§3.2, p. 972).

The control loop is explicit: “Config2Spec runs in a loop which dynamically switches between the two approaches until the specification is mined.” (§3.2, p. 972).

## technique 1: dynamic switching between data-plane and control-plane reasoning

how to do it

1. Initialize `cands` to all possible policies (in practice, to those holding in an initial concrete environment) and `verified` to empty (§3.2, p. 972). Initialize verification estimates using ten policy-set queries, and analysis estimates to zero (§4, p. 974).
2. Check whether `cands == verified`; if so, return `verified` (§3.2, p. 972).
3. Choose between analysis and verification using two predictors. Time-per-policy (TP) compares time per classified policy. Remaining-time (RT) compares estimated completion times, using remaining environments for analysis and remaining unclassified policies for verification. Choose analysis if either predictor favors it; choose verification only if both favor verification. Estimates are averaged over the last ten runs (§4, pp. 973–974).
4. For analysis, sample an environment, compute its forwarding graphs, infer policies, and intersect `cands` with them. If all concrete environments have been analyzed, set `verified` to `cands` (§3.2, p. 973; Appendix A, p. 983).
5. Before the first verification iteration, run topology-based trimming. For verification, query a policy set. If all hold, add them to `verified`; otherwise remove from `cands` the queried policies violated by the returned counterexample (§3.2, p. 973; Appendix A, pp. 983–984).

The precision argument requires precise data-plane analysis and control-plane verification; termination additionally requires both procedures to terminate. Each iteration analyzes a new environment or classifies at least one policy (Appendix A, p. 984). Inference: a Verus implementation could express the two-set invariant through transition preconditions and postconditions, then prove that equality yields the specification.

## technique 2: policy-aware concrete-environment sampling

`PickCE` uses the forwarding graphs of the previously analyzed environment and the current unclassified policies, `cands \ verified`. The policy graph copies the topology and weights each link by how many such policies forward traffic along it. Sampling chooses links to fail with probability proportional to their weights. Randomization mitigates repeated environments; if necessary, the sampler returns a random environment not yet analyzed. Analysis begins with all symbolic links up (§5.1, pp. 974–975).

`DPCompute` first obtains each router’s forwarding state, then constructs a forwarding graph for each equivalence class of destination prefixes with the same graph that can be represented by a prefix. `InferPol` uses dominator trees for reachability and waypoint policies, shortest paths to identify multiple equal-cost paths for load balancing, and absence of reachability for isolation (§5.2, p. 975).

Inference: in Verus, prove that `PickCE` returns an unseen environment satisfying the failure model and that `InferPol` computes exactly the supported policies of its forwarding graphs. The sampling probabilities affect performance; the invariant and progress conditions support precision and termination.

## technique 3: grouped control-plane verification

`CPVerification` encodes the network, failure model, and policy conjunction as `phi_net`, `phi_fmodel`, and `phi_pols`. It checks satisfiability of `phi_net ∧ phi_fmodel ∧ ¬phi_pols`. Unsatisfiability proves all queried policies; satisfiability yields a concrete environment violating at least one (§6, p. 975). `PickPolicies` returns a maximal set of unclassified policies sharing a destination prefix. The paper argues that different prefixes have different forwarding graphs, so combining them provides no verification benefit (§6, p. 976).

Inference: a Verus adaptation could verify a finite-state policy evaluator or specify a trusted solver interface. Matching the paper’s result requires quantification over every environment in the failure model and an exact interpretation of each policy.

## technique 4: topology-based trimming

`TopoTrim` runs before the first control-plane verification. For up to `k` link failures, it computes `(k+1)`-edge-connected components, whose nodes remain connected after any `k` edge removals. To accommodate fixed links, it first removes fixed-down links, subtracts their count from `k`, and adds `k` parallel copies of each fixed-up link. It prunes reachability and load-balancing policies when the source and destination router lack the required connectivity. For waypoint policies, it checks source-to-waypoint and waypoint-to-destination connectivity. Isolation policies are not trimmed (§7, p. 976).

The running example uses `k = 2`: router 3 can be disconnected by failing its two incident links, so reachability from 3 and waypoint or load-balancing policies involving it cannot hold (§7, p. 976).

## evidence, assumptions, and limits

The implementation contains 5k lines of Python and Java, using Batfish to compute forwarding states and Minesweeper to verify policies. The authors extended Minesweeper for waypoint and load-balancing policies. Supported configurations and features depend on those tools (§8, p. 976).

The synthetic experiments use BICS (33 routers, 48 links), Columbus (70, 85), and US Carrier (158, 189). NetComplete generated OSPF and BGP configurations for 2, 4, 8, and 16 prefixes, with five configuration sets per type and topology. Failure models allow any link to fail and use `k = 1, 2, 3`. For large networks, the experiments randomly select 20% of routers as possible waypoints. Experiments ran in virtual machines with 32 GB RAM and 12 virtual cores at 2.3 GHz (§8, pp. 976–977).

For US Carrier, Table 2 reports maximum OSPF time of 10,528.4 seconds and BGP time of 49,151.0 seconds, both at `k = 2` (p. 977). These are about 2.92 and 13.65 hours, respectively. The prose instead says “within 2.7 hours, for OSPF, and 13.7 hours, for BGP” (§8.1, p. 977); the OSPF statement conflicts with the table.

The baseline comparison uses smaller grids (4 by 5, 5 by 5, and 6 by 5), five OSPF configuration sets per topology, and `k = 1, 2, 3`. For `k = 2, 3`, Config2Spec improves data-plane analysis by 10.2× on average and up to 41.0×, and control-plane verification by 3.8× on average and up to 8.3×. For `k = 1`, data-plane analysis alone is faster by 24 seconds on average and up to 37 seconds (§8.2, p. 978).

At the policy-aware sampler’s switch to verification, candidate-set ratios relative to random sampling are 89.7%, 60.5%, and 51.6% for the three topologies (Table 4, p. 979). The sampler typically uses fewer samples, but random sampling switches earlier in 6 of 30 experiments (§8.3, p. 978). Trimming plus grouping reduces verifier queries to as little as 0.04% of the baseline, equivalent to a 2,500× reduction (§8.3, p. 979).

The Internet2 demonstration uses a modified May 2015 configuration with more than 90k lines, 10 routers, and 18 links. The authors removed syntax unsupported by Batfish and parts of BGP route-maps unsupported by Minesweeper; they mine only internal prefixes with no external peers. For `k = 1, 2, 3`, runtimes are 32, 314, and 1,805 seconds, returning 3,962, 3,405, and 3,339 policies (§8.4, p. 979).

The proof assumes exact analysis and verification of the modeled network (Appendix A, p. 984). Inference: this does not establish that the failure model captures actual failures or that inferred behavior matches operator intent. A verified Rust implementation would still need to justify its parser, solver interface, and correspondence between configuration and model.

## relevance to VL

Inference: Config2Spec suggests maintaining explicit over- and under-approximations, pruning obligations with concrete checks, and proving the residual policies universally. A Verus implementation should expose the failure model and policy semantics in its contracts. Exact mining of configured behavior alone does not establish that this behavior is what an operator wants.

## comparisons and work VL should not redo

The large-topology runtimes and the baseline speedups come from separate experiments (§8.1–§8.2, pp. 977–978). Batfish and Minesweeper supply the existing analysis and verification engines (§8, p. 976). Related reachability-mining work either approximates bounds over failure environments or mines a single environment (§9, p. 980). Inference: VL should focus on a verified Rust/Verus implementation and its model correspondence rather than rebuilding those engines. The paper does not establish whether such a verified implementation exists elsewhere.

## techniques for the catalog

- candidate/verified invariant — maintain a superset and subset whose equality identifies the specification
- adaptive solver choice — use time and progress estimates to choose concrete analysis or universal verification
- policy-aware sampling — weight failed links by unclassified-policy usage
- grouped verification — conjoin policies sharing a destination prefix
- topology trimming — use edge connectivity and the failure model to prune impossible policies

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Namely, we can only gain from verifying multiple policies in the same execution of the verifier."): checked all study claims, quotations, numbers, references, and technique steps against the complete paper, including references and Appendix A; corrected citations, switching and trimming details, precision assumptions, and the OSPF runtime discrepancy, added evaluation scope, and marked conclusions as inferences; did not reproduce experiments, inspect implementation code, or independently validate external references.
