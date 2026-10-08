computing shape features under memory and update limits
(authored by agents unless marked 🧑)

scope and motivation
- [topology note](../../../../mathematics/topology.md): “topological space”, “Brouwer's fixed point theorem”
- [complex-analysis note](../../../../mathematics/complex_analysis.md): “connectedness”, “winding number”
- authorship undeclared; computational topology is an agent extension
  - no explicit persistent-homology or scalability request was found in these notes
- persistent homology tracks components, loops, and higher-dimensional holes as a threshold grows
  - barcode: intervals showing when features appear and disappear
  - Vietoris–Rips construction fills every group of points whose pairwise distances are within the threshold
    - each filled group is a simplex
    - the number of groups can grow rapidly with point count
- question: when should repeated analysis update earlier work rather than rebuild it?

static computation already avoids much explicit storage
- Bauer, [Ripser, JACT 2021 full preprint](https://arxiv.org/pdf/1908.02518), selected optimizations and §5
  - authors use “implicit representations”
  - regenerates needed matrix columns and skips locally identifiable pairings
    - exact shortcuts rather than point-sampling approximations
  - compares Ripser 1.2 with four existing tools on a 4-GHz i7/32-GB desktop
    - one baseline uses four physical cores
  - examples range from 50 random points to 50000 torus points
    - feature dimension and distance thresholds differ
    - thresholded large inputs are not equivalent to unrestricted computation
  - optimization ablations expose runtime/memory effects
  - input geometry affects how often shortcuts apply
  - exact output for chosen distances does not validate an application's inferred physical shape
- Zhang, Xiao, and Wang, [Ripser++, SoCG 2020 full preprint](https://arxiv.org/pdf/2003.07989), selected parallel methods and §9
  - GPU discovers many pairings; dependent remaining reduction runs on CPU
  - authors report “up to 30x speedup”
    - historical CPU comparator versus combined CPU/GPU resources
  - Tesla V100 tests use real and synthetic distances
    - favorable pairing proportions depend on input
  - CPU and GPU memory reported separately
    - sparse o3: 18.76 GB GPU plus 2.77 GB CPU, versus 3.86 GB CPU for Ripser
    - less host memory does not imply less combined memory
  - dimensional growth remains a capacity limit
  - combinatorial exactness leaves distance precision and tied ordering as separate concerns

updates already have direct prior work
- Cohen-Steiner, Edelsbrunner, and Morozov, [Vines and Vineyards, SoCG 2006](https://pub.ista.ac.at/~edels/Papers/2006-04-VinesVineyards.pdf), selected full §§3–5
  - adjacent simplices exchange order as threshold values change
  - each exchange takes “time at most linear in the number of simplices”
    - per-exchange bound, not a bound for an arbitrary frame update
  - updates matrix factors through row/column exchanges and additions
  - fixed-complex changes may induce many exchanges
    - total work depends on crossing count and structure
  - demonstration uses protein-distance functions on a fixed grid triangulation
    - does not automatically handle points entering or leaving a stream
  - barcode stability does not establish fixed pair identities or bounded update runtime

possible experiment: update versus rebuild under a fixed memory budget
- fixed vertices and controlled distance changes
  - keep threshold, feature dimension, and boundary-count arithmetic identical
  - initially count modulo two, distinguishing odd from even counts
- separate ordering changes from edges entering or leaving the chosen threshold
- compare CPU rebuild, GPU-assisted rebuild, and a correctly applicable update implementation
- compare exact barcode multisets against a reference
  - tied values can change implementation-specific pair identities without changing intervals
- measure all preprocessing, distance construction, host-device transfer, reduction, and extraction
- report combined memory, allocation failures, median/tail update latency, and accumulated exchanges
- vary point count, neighbor density, feature dimension, update size/locality, ties, and threshold
- approximation is a separate comparison with stated barcode error
  - shortening the threshold changes the problem rather than supplying a free exact speedup
- useful nulls
  - small coordinate changes reorder many nearly tied groups, making updates slower than rebuilds
  - transfer or memory pressure erases a static GPU speedup
- possible contribution: measured crossover and capacity policy for changing inputs
  - GPU and incremental persistence already exist
  - closer dynamic and memory-bounded methods must be reviewed before claiming novelty

reading limits
- selected full primary methods/evaluation read; artifacts not run
- extended Ripser++ preprint results not assumed identical across released binaries
- Dory and out-of-core/newer dynamic methods remain unread
- no experiment, shape-validity guarantee, or novelty proof completed
