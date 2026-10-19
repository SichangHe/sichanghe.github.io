# VSS Challenge Problem: Verifying the Correctness of AllReduce Algorithms in the MPICH Implementation of MPI
(authored by agents unless marked 🧑)
Tag: `hovland2025vss`, [paper](https://doi.org/10.4204/EPTCS.432.10)

## what is proved

This paper defines a verification benchmark around MPICH 4.3.0 `MPI_Allreduce`. AllReduce computes a reduction (sum, product, minimum, or maximum) over every process and distributes the result. The target implementations must be equivalent to the MPI operation that performs reduce followed by broadcast. MPICH 4.3.0 has seven blocking algorithms, excluding special cases for intercommunicator reductions and shared-memory parallelism; the author makes three standalone versions and verifies two. The paper states: “We created standalone versions of three algorithms and verified two of them using CIVL.” (Abstract, p. 90)

The wrapper replaces MPICH internals with standard MPI calls so source can be compiled independently. It assumes built-in operators and datatypes. The paper explicitly says: “A limitation of this approach is that we assume that the reduction operator is a builtin reduction operator (maximum, sum, product, etc.) and the datatype is a builtin datatype (integer, float, double, etc.).” (pp. 90–91) This restricts both operators and datatypes to built-ins; derived datatypes are outside this wrapper’s stated scope.

## technique 1: isolate production code with a compatibility wrapper

Inference: use this when a system implementation depends on private structures that the verifier cannot model. Copy the production algorithm, then provide a header that maps internal communication and datatype routines to standard MPI. The author replaces `mpiimpl.h`, define `MPIC_Send`, `MPIC_Recv`, `MPIC_Sendrecv`, nonblocking calls, communicator rank/size, allocation, and reduction macros. The author also supplies standalone definitions of `MPI_Type_size`-based extent functions and `MPIR_Localcopy` using `MPI_Sendrecv` on `MPI_COMM_SELF` (Appendix B, pp. 95–96). Keep algorithm logic unchanged where possible: recursive doubling is copied verbatim, while two variants receive edits involving accessors and allocation (p. 91).

Inference: a possible Verus adaptation would model the wrapper as a verified interface layer. Define executable Rust functions for send, receive, and reduction with contracts describing message buffers and communicator state; use ghost state or a state-machine model for rank ownership. For this proposed Rust translation, MPI progress, datatype layout, and collective semantics would need explicit models. Wrapper contracts would remain assumptions unless proved against an MPI implementation.

Evidence: the wrapper let the files compile “with no modifictions and without any additional dependencies” for the recursive-doubling replacement (p. 90). Inference: this compilation claim alone does not establish that the wrapper preserves every MPICH behavior.

## technique 2: bounded symbolic equivalence with CIVL

Inference: use this when a verifier has a built-in semantic model for the external protocol. First provide CIVL definitions for functions absent from its MPI model: `MPI_Type_size` and `MPI_Reduce_local`. Provide an `MPIR_Localcopy` definition without `MPI_Sendrecv`, or remove the send-buffer parameter’s `const` modifier. Change temporary-buffer allocation to cast the pointer according to the datatype parameter: CIVL requires allocations to be cast to a non-void type (p. 91). The driver replaces the fixed length with symbolic bounds and values, with `NMAX` defaulting to 10: `$input int N; $assume (1 <= N && N <= NMAX); $input double x_val[N][16];`; each process initializes `x[i]` from `x_val[i][rank]`. Add `$assert (allreduce_result[i] == my_allreduce_result[i]);` inside the comparison loop, immediately before the conditional on line 28 (Appendix C, p. 97).

The CIVL proof checks arbitrary symbolic inputs within finite bounds, rather than a few concrete tests. For recursive doubling, the author proves equivalence for array lengths up to 10 for `MPI_SUM` and `MPI_PROD`, up to 5 for `MPI_MIN` and `MPI_MAX`, and process counts up to 10 and 5 respectively (p. 91). These are separate maxima by operator class; the paper does not claim an unbounded proof. The paper reports that reduce-scatter/allgather was verified after similar modifications, without separately specifying its bounds. Recursive multiplying was not expected to verify because CIVL could not then model its nonblocking sends and receives (p. 91).

Inference: a possible Verus adaptation would encode the allreduce specification as a `spec fn` over a finite sequence of per-rank values and prove an executable recursive-doubling function with `requires` bounds on process count and array length and `ensures` equality with the specification. Use loop invariants for the mask rounds and rank remapping; use `assert` or proof functions for reduction associativity/commutativity. In this proposed model, the message-passing state machine and reduction primitive would remain assumptions unless separately verified. A bounded proof can use explicit finite domains, but it does not justify arbitrary counts.

## algorithmic example: recursive doubling with non-power-of-two ranks

The appendix gives an actionable three-phase algorithm. First allocate a temporary buffer, copy local input to `recvbuf` unless `sendbuf == MPI_IN_PLACE`, compute `pof2` (largest power of two no greater than communicator size), and set `rem = comm_size - pof2`. For ranks below `2*rem`, each even rank sends to rank+1 and leaves the reduction (`newrank = -1`); each odd rank receives, locally reduces, and maps to `rank/2`. Remaining ranks map to `rank-rem` (Appendix A, lines 15–67, pp. 93–94). Second, for each `mask = 1,2,4,...` below `pof2`, exchange with `newrank ^ mask`, map that logical destination to a real rank, and reduce received data in the correct order. For noncommutative operators, the code chooses operand order using `dst < rank` (lines 67–95, p. 94). However, the Appendix B wrapper defines `MPIR_Op_is_commutative(X)` as `1` (line 26, p. 95), Inference: that wrapper always selects the commutative branch. Third, odd low ranks send the final result to their paired even ranks, which receive it (lines 97–107, p. 95).

Inference: a possible Verus adaptation would represent `newrank`, `mask`, and partner mapping as pure specifications and prove that each round preserves the multiset (or ordered fold for noncommutative operations) of contributors. A state-machine transition can represent each send/receive; invariants state that every active rank's buffer equals the fold of its assigned subset. The paper's code-level rank arithmetic transfers, but MPI blocking and aliasing behavior need separate contracts.

## techniques for the catalog

- compatibility wrapper: replace private implementation calls with standard-library shims while preserving algorithm control flow
- bounded symbolic equivalence: use symbolic sizes and values plus an assertion against a built-in reference model
- recursive-doubling rank reduction: fold non-power-of-two ranks into a power-of-two core, exchange by XOR masks, then restore excluded ranks
