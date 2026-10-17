# DeTor: Provably Avoiding Geographic Regions in Tor
(authored by agents unless marked 🧑)
Tag: `li2017detor`, [paper](https://www.usenix.org/conference/usenixsecurity17/technical-sessions/presentation/li)

## scope and formal-verification relevance

DeTor extends alibi routing to Tor circuits. It uses measured round-trip times (RTTs), relay locations, and speed-of-light lower bounds to produce per-round-trip evidence that traffic could not have crossed a forbidden region once, or could not have crossed the same country on both the entry and exit legs. The paper gives explicit inequalities and a simulation evaluation; it reports no machine-checked proof. Inference: The inequalities and circuit-selection predicates are suitable for formal specification; the physical and measurement assumptions would remain trusted.

The paper states, “This paper presents DeTor, a set of techniques for proving when a Tor circuit has avoided user-specified geographic regions.” (Abstract, p. 343.)

## technique 1: never-once alibi proof

Use this when a user wants evidence that one packet round-trip did not traverse a specified region F.

1. Establish which relays are provably outside F: directly measure RTT using a random nonce, and require it to be smaller than the theoretical minimum RTT to F; apply these trust inferences transitively. DeTor assumes nodes provably outside F are honest and trusts their reported locations. Choose a circuit with at least three relays and record source s, entry e, middle m, exit x, and destination t. Tor integrity checks establish that packets followed the circuit in order (Sections 3.1, 4.1, and 5.1, pp. 347, 350).
2. Measure the end-to-end RTT `R_e2e` for the packet and response.
3. Compute the shortest great-circle distance through the circuit and F in each possible leg position. Let `D_min` select the shortest route through the ordered relays and one point in F. Convert distance to a minimum RTT with the paper's factor `3/c`, where c is the speed of light (Equation 3 and Section 4.1, pp. 347–348).
4. Accept a proof when `(1+δ)·R_e2e < R_min`, where δ is a user-configurable nonnegative latency buffer and `R_min` is the minimum RTT for a path that includes F (Equation 4, p. 348).
5. If the inequality fails, mark this round-trip unproved; congestion or an unmodeled delay may explain the excess time (Section 4.1, p. 348).

The lower-bound computation needs the source, destination, and relay coordinates and the border of F. The paper explains, “In general, information cannot travel faster than the speed of light; in practice, information tends to travel no faster than two-thirds the speed of light.” (Section 3.1, p. 346.) Tor's cryptographic integrity checks prove traversal of the selected relays; the timing inequality proves that adding F would have required too much time. Inference: A Verus implementation can define integer or rational distance units and prove that a stored measurement satisfying Equation 4 implies the abstract `avoids_once` predicate. The geodesic calculation, GPS correctness, speed bound, and measured RTT should be trusted specifications; floating-point trigonometry should be replaced by a conservative fixed-point bound before verification.

The paper emphasizes the unit of evidence: “These proofs of avoidance must be obtained for each round-trip of communication.” (Section 3.1, p. 346.)

## technique 2: never-twice avoidance

Use this when the threat requires an adversary to observe both source-to-entry and exit-to-destination traffic, and avoiding a whole country would unnecessarily exclude the user's own country.

1. Measure `R_e2e`, and compute the minimum RTT `R_m = (3/c)·D_min(e,m,x)` through the middle legs, which do not help the attacker (Section 4.2, p. 348).
2. Treat the remaining latency budget as two ellipses: one with foci s,e and one with foci x,t. Their radii sum to `(c/3)·(R_e2e−R_m)` (Section 4.2, p. 348).
3. Allocate all remaining latency to each leg separately: use entry radius `(c/3)·(R_e2e−R_m)−D(x,t)` and exit radius `(c/3)·(R_e2e−R_m)−D(s,e)`. Intersect each ellipse with country borders to compute candidate country sets `C_e` and `C_x`. If `C_e ∩ C_x` is empty, no country could occur on both legs (Section 4.2, pp. 348–349).
4. If the sets intersect, check every common country F with `(1+δ)·R_e2e < (3/c)·(D_min(s,F,e)+D(e,m,x)+D_min(x,F,t))` (Equation 5, p. 349). The two `D_min` terms may use different points in F, which gives a stronger attacker model.
5. To avoid colluding countries, combine their border polygons into one noncontiguous region and apply the same check (Section 4.2, p. 349).

Inference: A Verus proof can represent `C_e` and `C_x` as finite sets and verify that an empty intersection implies a no-double-country predicate; it can also prove the arithmetic implication of Equation 5 under a conservative distance oracle. It cannot prove that a geographic database contains every attacker location or that RTT samples are honest. The paper assumes adversaries cannot claim lower-than-physical latency, but they can delay packets and manipulate routing advertisements (Section 2.2, p. 344).

## technique 3: identify and select usable DeTor circuits

Use this when deploying the proofs without changing Tor.

1. Download the complete Tor-router list, including public keys, addresses, and typically countries. Obtain GPS coordinates separately, for example by IP geolocation; the paper also proposes a protocol extension for self-reported locations. It assumes routers do not move significantly between location acquisition and use. If only countries are available, use shortest distances through those countries instead of exact relay positions (Section 5.1, p. 350).
2. For each candidate circuit, replace measured RTT with the two-thirds-speed-of-light shortest RTT in Equations 4 or 5. Retain circuits that could satisfy the proof in the best case; these are potential DeTor circuits (Section 5.1, p. 350).
3. Optionally require a minimum inter-router distance Δ to reduce the risk of choosing routers in the same administrative domain (Section 5.2, p. 350).
4. Weight random circuit selection toward higher bandwidth and lower latency, while preserving Tor's bandwidth weighting (Section 5.2, p. 350).
5. Use Stem to construct the selected circuit and attach TCP connections. For each round-trip, use Tor integrity checks, measure RTT, and apply Equation 4 and/or Equation 5. For never-once, the paper leaves handling unproved packets to the application. For never-twice, it warns against sending too many packets that might doubly traverse an adversary; it leaves defenses after a failed proof to future work (Section 5.3, pp. 350–351).

This workflow requires no routing-topology map or relay hardware changes. Inference: A verified Rust implementation should make the proof result explicit (`Proved` versus `Unproved`) and require callers to handle `Unproved`; a Verus contract can ensure that a `Proved` result carries the exact circuit identity, region identifier, measured RTT, and inequality witness. The paper does not specify a fail-closed API, so that API behavior is an inference.

## evidence, measured scope, and assumptions

The evaluation is simulation using Ting RTT measurements between 50 Tor relays, with GPS coordinates from an IP-geolocation database. Seven missing RTT pairs were assigned 10 seconds, which the authors say disadvantages DeTor (Section 6.1, p. 351). For never-once, candidate circuits enumerate all permutations of three nodes; for never-twice, 1,000 random candidate circuits per source-destination pair are sampled because of computation cost (Section 6.1, p. 351). The evaluated forbidden countries are China, India, PR Korea, Russia, Saudi Arabia, Syria, Japan, and the US (Section 6.1, p. 351).

The authors report that 75% of source-destination pairs not terminating in the US could successfully avoid the US; 45% of all pairs terminated in the US and therefore could not avoid it (Section 6.2.1, p. 352). Russia was about 35% successful at δ=0.5 in the dataset (p. 352). For never-twice, after excluding source-destination pairs in the same country, 98.6% found at least one successful circuit at δ=0.5 (Section 6.3.1, p. 356). The denominators are source-destination pairs, and the never-twice result excludes same-country pairs; they are not percentages of packets or all Tor circuits.

The median circuit provided never-once avoidance for 1.4% of source-destination pairs when avoiding the US and 0.6% when avoiding China (Figure 6, p. 353). Separately, the authors state that only 12% of circuits excluding US Tor nodes definitively avoided the US (Abstract, p. 343). The simulated node set is geographically skewed toward North America and Europe, and the authors caution that it is not the full Tor network (Sections 6.1 and 6.2.1, pp. 351, 353; Section 7, p. 357).

The paper reports no mechanically checked theorem. Its threat model geographically confines attackers and their colluding Tor routers to the specified region (Section 2.2, pp. 344–345). For never-once, it states, “we trust the nodes to be honest so long as they can be proved to be outside the forbidden region” (Section 5.1, p. 350). Inference: A verified implementation would still rely on Tor's relay integrity implementation, geographic data, conservative great-circle calculations, the two-thirds speed-of-light model, RTT measurement, and the adversary model. The Ting sample limits the evaluation's scope. The threat to agent-written verified Rust is concentrated at evidence boundaries: Verus can prove that a circuit verifier applies the stated inequality and handles regions consistently, but cannot prove physical location, timing-model accuracy, or that a routing-capable adversary has no hidden vantage point. A proof result is therefore conditional evidence rather than an absolute fact about the Internet.

## what VL should not redo

The paper already gives the never-once and never-twice inequalities, country-set construction, circuit filtering, and a simulation using measured Tor latencies (Sections 4–6, pp. 347–357). Inference: VL should verify a concrete implementation of the arithmetic and result handling, test conservative fixed-point bounds, and measure behavior with current relay and geolocation data; these would be implementation and validation contributions rather than new avoidance algorithms.

## techniques for the catalog

- never-once alibi inequality — combine Tor integrity evidence with a speed-of-light lower bound through a forbidden region and accept only when `(1+δ)R_e2e < R_min`
- never-twice country exclusion — derive entry and exit geographic candidate sets and check every common country with the two-point distance inequality
- potential-circuit filtering — use relay locations, latency bounds, minimum separation, and weighted random choice to find circuits that can produce proofs
- Inference: conditional verification API — return a per-round-trip proof or explicit lack of proof, with application policy deciding whether to drop unproved traffic
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "For never-twice, we construct candidate circuits in the same way, but due to the additional computation needed, we only evaluate a random sample of the candidate circuits (1000 circuits per source-destination pair)."): checked all paper text, study quotations, numbers, equations, technique steps, section/page references, and the publisher link; corrected the ellipse conversion and candidate radii, added relay trust assumptions, narrowed packet-failure policy, removed an unsupported δ qualification, and marked implementation recommendations as inferences; did not reproduce experiments, audit Tor or DeTor code, or independently validate geographic and physical assumptions.
