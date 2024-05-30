<!-- toc -->
# 300x Speed Up: Finding Inexact Matches in Recursive Sets

In a research project, I built a parser to analyze routes on the Internet,
but it bottlenecked on finding inexact matches of IP address prefixes in
recursive sets.
So, I applied various optimizations,
and eventually made the parser around 300 times faster,
analyzing around 800 millions of routes in 2h 50m[^cpu].

## Simplified background

Instead of explaining routing policies, RFC 2622, etc.,
I construct a simplified context where we try to find matches for a
(IP address) prefix $p$ in an AS Set $\mathcal A$.

$$
\begin{alignat*}{3}
    &\text{Route}\xrightarrow{\quad\text{specifies}\quad}\text{prefix }p\\
    {}_{\text{goes through}}&\downarrow\qquad\qquad\qquad\qquad
        \uparrow_{\text{is a match?}}\\
    \text{AS Set }\mathcal A\ni&
        \text{AS }a_i\xleftrightarrow{\text{correspond to}}
        \text{Prefix Ranges }\mathcal R_i
\end{alignat*}
$$

1. A route basically says a prefix
    $p$ like `193.254.30.0/24` can go through a sequence of
    Autonomous Systems (ASes), which are like points on a path.
1. Each AS $a_i$ corresponds to one set of prefix ranges
    $\mathcal R_i=\{r_1,r_2,\ldots\}$.
    Each prefix range $r_j$ (like `212.5.128.0/19^19-24`)
    is a match for many different prefixes
    (such as `212.5.128.0/24` and `212.5.129.0/24`).
    $R_i$ is a match of $p$ if any $r_j\in R_i$ is a match of $p$.
1. For our analysis,
    we want to know if $p$ has a match in an AS Set
    $\mathcal A=\{a_1,a_2,\ldots\}$ by trying to find an
    $a_i\in\mathcal A$ whose corresponding $\mathcal R_i$ is a match of $p$.

That is,
we want to find a match of $p$ by finding a match among
$r_j\in\mathcal R_i$ corresponding to each $a_i\in\mathcal A$.
This requires more complicated implementation than a simple lookup because:

- Prefix range matching is inexact.
    Whether $r_j$ is a match of $p$ needs to be checked case by case.
    So, simple lookups like hash table lookup and binary search do not suffice.
- AS Sets are recursive.
    $\mathcal A_i=\{a_1,a_2,\ldots,\mathcal A_{i1},\mathcal A_{i2},\ldots\}$
    may contain both ASes $a_j$ and other AS Sets $\mathcal A_{ij}$.
    So,
    finding a match for $p$ in
    $\mathcal A_i$ may require checking an unbounded number of sets.
- There are too many prefix ranges to flatten. Trust me.
    I tried to create a set of all prefix ranges for each AS Set and ran out of
    all 300GiB of RAM, causing the server to hang.

## Naive implementation

<!-- TODO: Finish this off. -->

[^cpu]: Run on a server with dual EPYC 7763 64-Core processors.

{{ #include footer.md }}

*2024-05-30*
