<!-- toc -->
# Advanced Analysis of Algorithms

6hw + 3qz + 2 theoretical thinking project

RTH505

## theory overview

NP&P → **decision problem** on `&[u1]` (language)\
⇒ search problem (harder, but may reduce to decision problem)\
⇒ optimization

desicion problem → board game

P space: $∃x_1, ∀x_2, ∃x_3, \cdots\text{ s.t.
}f(\vec x)$ where $|\vec x|$ is polynomial

- P time $\in$ P space (equal?)
- PPAD

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
    1. split by $a_{t_1}$ to $l_L$, $l_R$,
        throw away impossible list and shrink $k$
    - power of randomization: $O(n^2)$ but $\Theta(n)$ wrt randomness:\
        $\frac{1}{2}$ of
        the time we pick element ranked $\frac{n}{4}\sim\frac{3n}{4}$,
        can throw away $\frac{n}{4}$ of the list

        $$
        ⇒ \mathbb ET(n) ≤ n+\frac{1}{2}\mathbb ET\left(\frac{3n}{4}\right)+
        \frac{1}{2}\mathbb ET(n)\\
        ⇒ \mathbb ET(n) ≤ 2n + \mathbb ET\left(\frac{3n}{4}\right)\\
        ⇒ \mathbb ET(n)\sim O(n)
        $$

⇒ graph $G=(V,E),E\subseteq V × V$

- $\ell(e),e\in E$
- binary search is graph w/ $\ell(e)\equiv 1$,
    each number node has edge w/ next number
    - local info, e.g., $m-1$ is closer
- generalized undirected graph "binary search" for target
    $t\in V$ from $q_i\in V$
    - $N_G(v),v\in V$
    - iteration: $q=t$ or give $q'\in N_G(v)$ closer to $t$
    - theorem: ∃ algorithm to find $t$ in $O(\log n)$ question
    - where to start
        - want: shrink possible answer set $P_i$,
            set of node on shortest path from $q_i$ to $t$
        - ⇒ middle:
            $\displaystyle\argmin_u\Phi_{P_0}(u)=∑_{v\in P_0}d_G(u,v)$
