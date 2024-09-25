# Advanced Analysis of Algorithms

6hw + 3qz + 2 theoretical thinking project

RTH505

quiz 1 up to greedy

## theory overview

NP&P → **decision problem** on `&[u1]` (language)\
⇒ search problem (harder, but may reduce to decision problem)\
⇒ optimization

desicion problem → board game

P space: $∃x_1, ∀x_2, ∃x_3, \cdots\text{ s.t.
}f(\vec x)$ where $|\vec x|$ is polynomial

- P time $\in$ P space (equal?)
- PPAD

\#P: account #solution to NP problem

- each NP problem has \#P problem
- \#P-complete $\subseteq$ P space

linear programming: proved P

learning problem

- binary classification: $h:X\mapsto\{0,1\}\in H$
- learnable: train on unknown distribution $D$,
    prediction correction increase

## binary search to graph search

binary search $[1:n]$ (go to middle)\
⇒ quick selection (broader notion of middle; randomize):

- input: $(a_1,\cdots,a_n),k$
- want: $k$-th smallest
- algorithm:
    1. pick $a_{t_1}$ with random $t_1$
    1. split by $a_{t_1}$ to $l_L$, $l_R$, throw away impossible list and
        shrink $k$

power of randomization: $O(n^2)$ but $\Theta(n)$ wrt randomness:\
$\frac{1}{2}$ of the time we pick element ranked $\frac{n}{4}\sim\frac{3n}{4}$,
can throw away $\frac{n}{4}$ of the list

$$
⇒ \mathbb ET(n) ≤ n+\frac{1}{2}\mathbb ET\left(\frac{3n}{4}\right)+
\frac{1}{2}\mathbb ET(n)\\
⇒ \mathbb ET(n) ≤ 2n + \mathbb ET\left(\frac{3n}{4}\right)\\
⇒ \mathbb ET(n)\sim O(n)
$$

⇒ distance graph $G=(V,E),E\subseteq V × V$

- $\ell(e),e\in E$
- binary search is graph w/ $\ell(e)\equiv 1$,
    each number node has edge w/ next number
    - local info, e.g., $m-1$ is closer
- generalized undirected graph "binary search" for target $t\in V$ from
    $q_i\in V$
    - $N_P(v,t)=\{z\in P|(v,z)\text{ on shortest path to }t\}$
        - $z$ on shortest path $d_G(u,v)$ if: $d_G(z,v)+\ell(u,z)=d_G(u,v)$
    - condition: will give set of vertex on shortest path
    - iteration: $q=t$ or give $q'\in N_G(v,t)$ closer to $t$
    - theorem: ∃ algorithm to find $t$ in $O(\log n)$ question
    - want: shrink possible answer set $P_i≤V$, set of node on
        shortest path from $q_i$ to $t$
    - $P_0=V$
    - ⇒ medium:
        lowest potential function
        $\displaystyle\argmin_u\Phi_{P_0}(u)=∑_{v\in P_0}d_G(u,v)$
    - update w/ hint $v_t$: $P_{t+1}=P_t\cap N_{P_t}(q_t,v_t)$
- claim: $|P_{t+1}|≤\frac{1}{2}|P_t|$
- proof:

    $$
    \Phi_{P_t}(u)≤
    \Phi_{P_t}(q_t)-(|P_{t+1}|-|P_t/P_{t+1}|)-\ell(q_t,v_t),\\
    \Phi_{P_t}(u)≥\Phi_{P_t}(q_t)\\
    ⇒ -|P_{t+1}|+|P_t/P_{t+1}|≥\ell(q_t,v_t)≥0\\
    ⇒ |P_{t+1}|≤\frac{1}{2}|P_t|
    $$

## interactive learning

*A General Framework for Robust Interactive Learning*, Ehsan Emamjomeh-Zadeh,
David Kempe

given hypercube $X$, search space $H$, find $h\in H$ s.t. $h≤X$

- [VC dimention](stats303.html#vapnik-chervonenkis-dimension-vc-dimension)
    - $n$ hyperplane in $d$-dimensional space can split $n^d$ cell

## greedy algorithm

- can deal with NP-hard problem
- optimality:
    - argument of staying ahead
    - exchange argument
- proving optimality
    - optimum must exist for finite problem
    - compare to imaginary optimum
    - focus on simple local consistency that eliminate bad possibility

### Huffman Codes

- prefix code: no code is prefix of another, $∑ → \{0,1\}^*$
- ⇒ binary tree w/ $n$ leaf, each leaf's parents not usable
    - optimum is trivial when tree is given
    - tree w/ same number of leaf of each length are equivalent
    - has to be proper: each node is either leaf or parent of 2
    - substructure optimality: bottom 2 children must map to
        2 least frequency
- induction: merge 2 least frequency, treat it as one letter to
    find mapping for the rest

### minimum spanning tree (MST)

- cut: split graph $V$ to $S$ and $\bar S$

    $$
    \text{cut}(S)=\{(u,v)\in E|u\in S,v\in\bar S\}
    $$

- affinity: inverse distance, closeness

#### Kruskal's algorithm

traditional Kruskal

1. sort $E$ ascending
1. from no node, add edge from small, w/o cycle

revised Kruskal

1. sort $E$ ascending
1. from $G$, remove edge from big, w/o disconnecting

#### Prim's algorithm

1. choose arbitrary node "home town" $v_0$. $S_0:=\{v_0\}$
1. repeat: find closest node $v_{i+1}$ w/ edge form $S_i$.
    $S_{i+1}:=S_i\cup\{v_{i+1}\}$

- why: cut property: shortest cut edge is in MST
    - reverse cut property: longest edge in cycle is not in MST

### clustering

given $G=(V,E,d)$ w/ metric $d$, $k$, want $(S_1,\cdots,S_k)$ s.t.

1. $S_i\subseteq V$
1. $∀i≠j,S_i\cap S_j = ∅$
1. $\bigcup_i S_i=V$
1. maximize shortest inter-cluster edge

- idea: for tree $G$, just need to cut $k-1$ longest edge
- ⇒ algorithm: for graph $G$, cut $k-1$ longest edge in MST for
    optimal clustering
- proof: denote greedy solution cluster $V_1,\cdots,V_k$,
    optimum cluster $C_1,\cdots,C_k$
    1. if $\{V\}≠\{C\}$, ∃ node $v_1≠v_2\in V_i$ s.t.
        $v_1\in C_p,v_2\in C_q,C_i\neq C_j$
    1. $⇒ ∃e$ in MST on path from $v_1$ to $v_2$,
        within $V_i$ s.t. $e$ cross $C_p$ boundary
    1. by reverse Kruskal, in MST, longest edge that
        do not disconnect graph are gone\
        $⇒$ by greedy algorithm, $\ell(e)≤d_{k-1}$ the $k-1$th longest edge in
        MST
    1. $⇒$ optimum solution has shortest inter-cluster edge $≤d_{k-1}$,
        same or smaller than greedy solution ⇒ contradiction

## approximation algorithm

### set cover

- given: input ground set $V=\{1,\cdots,n\}$,
    $S_1,\cdots,S_i\subset V$ w/ $w_i,i\in I=[1,\cdots,m]$

- want: $T\subset I$ s.t. $∪_{i\in T}S_i=V$ and $|T|$ minimized

    $$
    \argmin_{T\subset I\\∪_{i\in T}S_i=V}∑_{i\in T}w_i
    $$

- idea: minimize average cost $\frac{w_i}{|S_i|}$
- algorithm:
    1. $U:=V$
    1. while $U≠∅$, pick $\displaystyle\argmin_{i}\frac{w_i}{|S_i\cap U|}$,
        set $U=U/S_i$
- not optimal when many large $S_i$ also cover small $S_j$
- claim: greedy is within $\log n$ of optimum, where $n=\max_j|S_j|$
    - doing consistently better than $\log n$ of optimum is NP-hard
    - greedy cost

        $$
        c_G(i_t)=\frac{w_{i_t}}{|S_{i_t}\cap U_t|} ≤ H(|S_{j_t}|)w_{j_t}
        $$

        - [harmonic
            series](../mathematics/sequence_series.html#harmonic-series)
            $H(k)=∑_{i=1}^k\frac{1}{i}$
        - when $h$th (starting from 0) element $V_{\pi_h}$ in
            $S_j$ is covered,
            $\displaystyle c_G(\pi_n)≤\frac{w_j}{|S_j|-h}$ because at most
            $h$ element is covered in $S_j$

### set function

$f:\{S|S\subseteq V\} → \R$

- salary for group in society
- hypergraph: indicator set function determine if each subset is hyperedge

property:

1. grounded: $f(∅)=0$
1. monotone: $∀ S\subseteq T,f(S) ≤ f(T)$
1. submodular

#### submodular function

$∀ S\subseteq T,∀ v\notin T$

$$
\nabla f_S(v) ≥ \nabla f_T(v)
$$

- diminishing return: less happier when having more and more chocolate
- discrete derivative: $\nabla f_S(v)=f(S\cup \{v\})-f(S)$
    - how much value can $v$ add to $S$
- complementarity: $1 + 1 > 2$
- $f,g$ submodular $⇒ ∀a,b≥0, af+bg$ submodular
- "or" is fundamentally submodular

problem

- input: submodular $f:\{S|S\subseteq V\} → \R^*$, $k$
- output: $S\subset V$, s.t. $|S|=k$, $\max f(S)$
- oracle model: can get $f(T)$

- example: max cover: for mapping $f:V → B$ choose $k$ element from $V$ to
    maximize $|f(S)|$
- greedy algorithm $S'$: at time $t$, add $u_t$ that maximize
    $\nabla f_{u_t}(S_{t-1}')$

theorem: $∀f$ monotone & submodular, $∀k$, $f(S')≥(1-\frac{1}{e})f(S^*)$

proof:

$$
S^*=:\{v_1,\cdots,v_k\};\\
f(S^*)≤f(S^*\cup S_t')=f(S_t')+[f(S^*\cup S_t')-f(S_t')];\\
f(S^*\cup S_t')-f(S_t')=
∑_{i=1}^k[f(\{v_1,\cdots,v_i\}\cup S_t')-f(\{v_1,\cdots,v_{i-1}\}\cup S_t')]\\=
∑_{i=1}^k\nabla f_{v_i}(\{v_1,\cdots,v_{i-1}\}\cup S_t')≤
∑_{i=1}^k\nabla f_{v_i}(S_t')=
k\nabla f_{v_i}(S_t')\\≤
k\nabla f_{u_{t+1}}(S_t')=
k[f(S_{t+1}')-f(S_t)]\\
⇒ \delta_t:=f(S^*)-f(S_t')≤k[f(S_{t+1}')-f(S_t)]\\=
k[(f(S_{t+1}')-f(S^*))+(f(S^*)-f(S_t))]\\=
k[-\delta_{t+1}+\delta_t]\\
⇒ \delta_{t+1}≤\frac{k-1}{k}\delta_t≤\cdots≤
\left(1-\frac{1}{k}\right)^{t+1}\delta_0\\=
\left(1-\frac{1}{k}\right)^{t+1}f(S^*)≤
e^{-\frac{t+1}{k}}f(S^*)\\
⇒ f(S'_k)=f(S^*)-\delta_k≥\left(1-e^{-\frac{k}{k}}\right)f(S^*)
$$

alternative definition for submodular function (equivalent):

$$
∀A,B\subseteq V,f(A)+f(B) ≥ f(A\cap B)+f(A\cup B)
$$

### reachability

$\text{Reach}(S):=\{v|\text{can reach }v\text{ from }S\}$

$f(S)=|\text{Reach}(S)|$

- $f$ submodular:

    $$
    \nabla f_S(v)=|\{x|\text{can reach }x\text{ from }v\text{ but not }S\}|
    $$

### network influence

input $G=(V,E),p_e;t=1,\cdots,T$

- dynamic & complex compared to traditional static graph
- network influence maximization: often submodular

#### independent cascade (IC)

each node has probability $p$ to influence

- stochastic network influence; e.g., pandemic
- $S_t=S_{t-1}\cup N(S_{t-1})$
- influence spread $\sigma(S)=∑_{W\in 2^V}\Pr_W[S → W]|W|$
    - generally \#P-complete
- roughly stochastic "or" process; distribution of reachability model

#### threshold model

each node $v$ has threshold $\theta_v$ to be influenced by neighbor

- deterministic/ stochastic by $\theta_v$, e.g., idea spreading

## iterative algorithm

### polynomial local search (PLS)

- e.g., simplex algorithm, bubble sort
- polynomial number of viable option at each step
- always improve because know potential function
- will stop because define direct acyclic graph (DAG)

#### Lloyd's algorithm (K-means clustering)

input: $P=\{p_1,\cdots,p_n\}\subseteq\R^d$\
want: cluster into $P_1,\cdots,P_k$

- representation (center) $c_i$ of $P_i$
    - mean of cluster minimize variance of distance
- algorithm:
    1. randomly initialize $P_i^0$
    1. calculate $c_i^t$
    1. regroup $P_i^t$ by $\min(p_j,c_i^{t-1})$
- Voronoi diagram: zip code
- exponential time to converge, but polynomial time to
    get $\frac{1}{\varepsilon}$ close

## geometric space

### 1-dimensional space

- nice because: can sort, minimal neighborhood, point = hyperplane
- mean: not statistically robust; median: robust

#### approximate median

$(\frac{1}{2}-\varepsilon)$-median

algorithm, use 2-way tree of height $h$:

1. uniformly sample $H=∑_{i=0}^h3^i$ point
1. find median of every 3 point
1. find median of every 3 median on the last level, recursively

proof:

- define $\Pr_h(x)$ probability that median algorithm w/ height
    $h$ yield result $<x$
- $\Pr_0(x)=x$ because only 1 point
- at least 2 point among 3 need to be $<x$ to get $<x$ median:

$$
    \Pr_{h+1}(x)={3\choose 2}\Pr_h(x)^2(1-\Pr_h(x))+{3\choose 2}\Pr_h(x)^2\\
    ⇒ \Pr_{h+1}(x)=3\Pr_h(x)^2-2\Pr_h(x)^3
$$

- by induction,
    $\Pr_h(\frac{1}{2}-\varepsilon)≤\frac{1}{2}-(\frac{11}{8})^h\varepsilon$ if
    $\varepsilon≤\frac{1}{4}$

### median 2-dimensional space

- $\delta$-centerpoint: for any projection, at approximate median
- theorem: $∀P\subseteq\R^d$, $∃\frac{1}{d+1}$-centerpoint
    - intuition: need $d+1$ point to trap 1 point
- VC dimension theory: need $\frac{d}{\varepsilon^2}$ sample to estimate well
- $\varepsilon$-good sample $S\subset P$: $∀$ half space $H$,
    $|\frac{|P\cap H^+|}{|P|}-\frac{|S\cap H^+|}{|S|}|≤\varepsilon$
