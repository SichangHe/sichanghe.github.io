# Statistical Machine Learning

SGD > GD for online learning

SGD problem: mini batch too big

gated recurrent unit (GRU): a RNN

principal component analysis (PCA): autoencoder, dimensionality reduction

## Bayesian decision theory

loss $\lambda_{ik}$: take action $\alpha_i$ when sample belong to $C_k$

goal: minimize risk

$$
R(\alpha_i|X)=\sum_{k=1}^K\lambda_{ik}P(C_k|X)
$$

for 0-1 loss, $R(\alpha_i|X)=1-P(C_i|X)$

reject class: a $K+1$th class w/ fixed loss $\lambda\in(0,1)$

- $⇒ R(a_{K+1}|X)\equiv\lambda$
- reject when $\min_{i=1\ldots K}R(\alpha_i|X)>\lambda$

or, maximize discriminant function $g_i(x),i=1\ldots K$

maximum likelihood estimator (MLE)

parametric (distribution based on known parameters) vs non-parametric

## linear regression

$$
X\in\R^{N × P}\\
Y\in\R^{N × 1}\\
L(W)=\Vert W^TX-Y\Vert^2=W^TX^TXW-2W^TX^TY+Y^TY\\
\argmin_WL(W) ⇒ \frac{\partial L(W)}{\partial W}=0\\
⇒ 2X^TXW-2X^TY=0\\
⇒ \hat W=(X^TX)^{-1}X^TY
$$

### regularization in lasso

$$
\argmin_W\left[
    L(W) + \lambda P(W)
\right] ⇒ \hat W=(X^TX+\lambda I)^{-1}X^TY
$$

assuming $P(W)=\Vert W\Vert_2$

$X^TX+\lambda I$ invertible, proof by positive definite

## K-nearest neighbors (KNN)

need to try different $K$

## support vector machine (SVM)

### hard-margin binary SVM

$y=-1,1$

objective, maximize minimum margin:

$$
\argmax_{W,b}\min_{i=1\ldots N}\frac{1}{\Vert W\Vert}|W^TX_i+b|
\text{ s.t. } y_i(W^TX_i+b)>0\\
⇒ \argmax_{W,b}\frac{1}{\Vert W\Vert}\cdot1
\text{ s.t. } y_i(W^TX_i+b)\ge1\\
⇒ \argmin_{W,b}\frac{1}{2}\Vert W\Vert^2
\text{ s.t. } y_i(W^TX_i+b)\ge1
$$

by

$$
|W^TX_i+b|=y_i(W^TX_i+b)\\
\min_{i=1\ldots N}|W^TX_i+b|:=1
$$

apply Lagrange multiplier:

$$
L(W,b,\lambda)=
    \frac{1}{2}\Vert W\Vert^2+\sum_{i=1}^N\lambda_i(1-y_i(W^TX_i+b))\\
⇒ \min_{W,b}\max_{\lambda_i\ge0}L(W,b,\lambda)\\
⇒ \max_{\lambda_i\ge0}\min_{W,b}L(W,b,\lambda)
$$

$$
\frac{\partial L}{\partial W}=\frac{\partial L}{\partial b}=0\\
⇒ \hat W=\sum_{i=1}^N\lambda_iy_iX_i,\quad\sum_{i=1}^N\lambda_iy_i=0\\
⇒ \hat L=-\frac{1}{2}\Vert\hat W\Vert^2+\sum_{i=1}^N\lambda_i=
    -\frac{1}{2}\sum_{i=1}^N\sum_{j=1}^N\lambda_i\lambda_jy_iy_jX_i^TX_j+
    \sum_{i=1}^N\lambda_i
$$

final objective:

$$
\argmin_{\lambda_i\ge0}(-\hat L)=
    \frac{1}{2}\sum_{i=1}^N\sum_{j=1}^N\lambda_i\lambda_jy_iy_jX_i^TX_j-
    \sum_{i=1}^N\lambda_i
$$

solution: sequential minimal optimization (SMO)

- fix all but 2 $\lambda_i$, and iterate
- 2 variable because $\sum_{i=1}^N\lambda_iy_i=0$

### soft-margin binary SVM

[hinge loss](/notes/cs/machine_learning.html#hinge-loss)

### kernel SVM

solve non-linear problem w/ linear classifier

[kernel](notes/cs/machine_learning.html#kernel-for-support-vector-machine),
but w/o $\varphi$ restriction

objective:

$$
\argmin_{\lambda_i\ge0}(-\hat L)=
    \frac{1}{2}\sum_{i=1}^N\sum_{j=1}^N\lambda_i\lambda_jy_iy_jK(X_i,X_j)-
    \sum_{i=1}^N\lambda_i
$$

#### positive-definite kernel

positive-definite kernel output positive-definite matrix

- positive-definite matrix:
    pivots > 0 or eigenvalues $\lambda_i>0$ or subdeterminant > 0
- Hilbert space: symmetric, positive-definite, linear

alternative definition of kernel:

- symmetric
- positive-definite: Gram matrix $G$ semi-positive definite
    $$
    G:=\begin{bmatrix}
        K(X_1,X_1)&\cdots&K(X_1,X_N)\\
        \vdots&\ddots&\vdots\\
        K(X_N,X_1)&\cdots&K(X_N,X_N)
    \end{bmatrix}
    $$

## dimensionality reduction by principal component analysis (PCA)

lossy transformation from $p$ to $q$ dimension

- mean: $\frac{1}{N}X^T\vec1$
- covariance: $\frac{1}{N}X^THX$
    - centering matrix: $H:=I-\frac{1}{N}\vec1{\vec1}^T$
        - $H^T=H,H^2=H$
    - proof:
        $$
        S=\frac{1}{N}\sum_{i=1}^N\Vert X_i-\bar X\Vert^2=
        \frac{1}{N}\Vert\begin{bmatrix}
            X_1-\bar X&\cdots&X_N-\bar X
        \end{bmatrix}\Vert^2
        $$

maximize variance

$$
\argmax_{\vec u}\vec u^TS\vec u
\text{ s.t. }\vec u^T\vec u=1\\
⇒ \argmax_\lambda L(\vec u,\lambda)=\vec u^TS\vec u+\lambda(1-\vec u^T\vec u)\\
⇒ S\vec u=\lambda\vec u
$$

minimize distance between full projection ($p$-dimensional) and
principal component analysis (PCA, $q$-dimensional):

- centering: $\tilde X_i=X_i-\bar X$
- lossless transformation with $\vec u_k$:
    $X_i'=\sum_{k=1}^p(\tilde X_i^T\vec u_k)\vec u_k$
- PCA transformation:
    $\hat X_i=\sum_{k=1}^q(\tilde X_i^T\vec u_k)\vec u_k$

objective:

$$
\argmin_{\vec u_k}\frac{1}{N}\sum_{i=1}^N\Vert\hat X_i-X_i'\Vert^2=
\frac{1}{N}\sum_{i=1}^N\left
    \Vert\sum_{k=q+1}^p(\tilde X_i^T\vec u_k)\vec u_k
\right\Vert^2=
\frac{1}{N}\sum_{i=1}^N\sum_{k=q+1}^p(\tilde X_i^T\vec u_k)^2\\
⇒ \argmin_{\vec u_k}\sum_{k=q+1}^p\vec u_k^TS\vec u_k
\text{ s.t. }\vec u_k^T\vec u_k=1\\
⇒ S\vec u_k=\lambda\vec u_k
$$

## Monte Carlo sampling method

- sampling
    - purpose: determine parameter when doing sum/integral
    - good: from area of high probability & independent
- Monte Carlo drawback
    - does not work in high dimension
    - assume sample independence

### transformation method

1. assume $z ∼ p(z_0)$
1. get sample $x$
1. assume CDF $h(z_0=x)$
1. solve $z_1=h^{-1}(x)$
1. get another sample and repeat

### rejection sampling

1. define distribution $q(z)$ s.t. $∃ k, ∀ z,kq(z)≥p(z)$
1. get sample $z_i ∼ q(z)$
1. rate $α:=\frac{p(z_i)}{kq(z_i)}\in(0,1]$
1. select random variable $x ∼ U(0,1)\in(0,1]$
1. if $α ≥ x$, accept sample $z_i$; else reject

- reject most sample when $k$ large
- $k$ hard to determine
- waste iteration

### importance sampling

for value $f$ following distribution with PDF $p$, do not know CDF,
want expectation

define distribution $q(z)$ with known CDF

weight (importance) $\omega_i:=\frac{p(z_i)}{q(z_i)}$

$$
E(f):=∫f(z)p(z)dz=∫f(z)\frac{p(z)}{q(z)}q(z)dz
\approx ∫\omega_if(z)q(z)dz
\approx \frac{1}{L}∑_{i=1}^L\omega_if(z_i)
$$

### sampling-importance-resampling

1. get $L$ sample $z_i$ from $q(z)$ with known CDF
1. $\displaystyle\omega_i:=\frac{p(z_i)}{q(z_i)}$
1. normalize $\displaystyle\tilde\omega_i:=\frac{\omega_i}{∑_iw_i}$
1. treat $\tilde\omega_i$ as probability for $z_i$ and resample

### simulated annealing

- to avoid trapped in local minimum
- still need to try multiple time

when seeking minimum, accept increase in $f$ with probability

$$
e^{-\frac{\Delta f}{T}}<1
$$

where temperature
    $T\in(0,1),\quad T\leftarrow T\gamma,\quad \gamma=0.99\in(0,1)$

## Markov chain

- [transition matrix](stats210.html#transition-probability-matrix) $Q$
    - stochastic matrix, because each row sum to 1
        - $\{Q^n\}$ converge, stationary $\Leftarrow$
            - all eigenvalue $|\lambda|≤1$
            - $Q=A\Lambda A^{-1} ⇒ Q^n=A\Lambda^nA^{-1}$
                where $\Lambda^n$ is diagonal with entries $\lambda_i^n$
- $\vec\pi_t$ probability be at state $x=1\ldots N$ at time $t$
    - [stationary distribution](stats210.html#stationary-distribution):
        $\pi_{m+1}=\pi_m$ when $m$ large
    - $\pi_{t+1}=\pi_tQ$
- sampling method: given PDF $p(z)$, set $Q$ s.t. $\pi(z)=p(z)$

### detailed balance

Markov chain in stationary distribution if

$$
\pi(x)p_{xy}=\pi(y)p_{yx}
$$

## Markov chain Monte Carlo (MCMC)

- work in high dimension
- honor probability dependency between sample

### metropolis hasting algorithm (MH algorithm)

want to sample target distribution $p$

design Markov chain w/ stationary distribution $\pi=p$:

1. get Markov chain w/ $Q$ s.t. not necessarily $\pi=p$
1. acceptance rate $\displaystyle α(x,x^*):=\min \left(
        1, \frac{p(x^*)Q_{x^*,x}}{p(x)Q_{x,x^*}}
    \right)$
    - $⇒ p(x)Q_{x,x^*}α(x,x^*)=p(x^*)Q_{x^*,x}α(x^*,x)$
1. use new Markov chain w/ $Q'_{x,x^*}:=α(x,x^*)Q_{x,x^*},\quad x^*≠x$
    - $Q_{x,x}$ take the rest of probability s.t. $∑_yQ_{x,y}=1$

- drawback: do not know when stationary/converge. sample may be dependent

### Gibbs sampling

want to sample variable $x_i$ following different distribution

fix $x_{-i}:=\{x_1\ldots x_{i-1},x_{i+1}\ldots\}$ to previous value
    when sampling $x_i$:
$$
Q_{x,x^*}:=p(x_i^*|x_{-1})
$$

a special case for metropolis hasting method $\Leftarrow$

$$
p(x_{-i}^*)=p(x_{-i})\\
⇒ α(x,x^*)=
\frac{p(x^*)p(x_i|x_{-i}^*)}{p(x)p(x_i^*|x_{-i})}=
\frac{p(x_i^*|x_{-i}^*)p(x_{-i}^*)p(x_i|x_{-i}^*)}
    {p(x_i|x_{-i})p(x_{-i})p(x_i^*|x_{-i})}=
\frac{p(x_i^*|x_{-i})p(x_{-i})p(x_i|x_{-i})}
    {p(x_i|x_{-i})p(x_{-i})p(x_i^*|x_{-i})}=1
$$

## entropy

- randomness, impurity, how easy to determine
- equal to expected surprise
    $$
    H=\mathbb E(\sup)=\sum_xp(x)\sup(x)=-\sum_xp(x)\ln p(x)
    $$
- [cross entropy loss](notes/cs/machine_learning.html#cross-entropy-loss-for-binary-classification)

### surprise

$$
\sup=\ln\frac{1}{p(x)}=-\ln p(x)
$$

### decision tree based on entropy

- information gain
    $$
    I(Y|x_i)=H(Y)-H(Y|x_i)\\
    \text{where}\quad H(Y|x_i)=\sum_{x}p(x_i=x)H(Y|x_i=x)
    $$
- maximize information gain on each split

## convergence and consistence

- Bayes classifier: minimize expected risk
- empirical risk minimization (ERM): minimize loss on training data

### consistence

empirical risk $R_n(f)$ close to true risk $R(f)$
$$
P(\sup_{f\in\mathcal F}|R_n(f)-R(f)|>ε)→0
$$

- $⇔$ uniform convergence
- $$
    P \left(
        |R(f)-R_n(f)|≥ε
    \right)≤2\exp(-2nε^2)
    $$

- generalization bound for finite class $\mathcal F=\{f_i\},i=1,…,m$
    $$
    P \left(
        |R(f)-R_n(f)|≥ε
    \right)≤2m\exp(-2nε^2)
    $$
    - proposition: choose $\delta\in(0,1) ⇒$ w/ at least $1-\delta$ probability
        $$
        |R(f)-R_n(f)|≤\sqrt{\frac{\ln(2m)-\ln\delta}{2n}}
        $$
        - by $\delta:=2m\exp(-2nε^2)$
- generalization bound for infinite class $\mathcal F$
    $$
    P \left(
        \sup_{f\in\mathcal F}|R(f)-R_n(f)|>ε
    \right)≤2\mathcal N(\mathcal F,2n)\exp\left(\frac{-nε^2}{4}\right)
    $$
    - proof:
        $$
        P \left(
            \sup_{f\in\mathcal F}|R(f)-R_n(f)|>ε
        \right)≤P \left(
            \sup_{f\in\mathcal F}|R(f)-R_n(f)|≥\frac{ε}{2}
        \right)\\
        ≤2P \left(
            \sup_{f\in\mathcal F}|R_n(f)-R_n'(f)|≥\frac{ε}{2}
        \right)\\
        $$
        where $R_n'(f)$ is empirical risk of another $n$ sample (ghost sample)

        $⇒ ∃c ≤ \mathcal N(\mathcal F,2n)$ class of $f$ for sample & ghost sample
    - problem: hard to compute shattering coefficient

### shattering coefficient $\mathcal N(\mathcal F,n)$

maximum number of $\mathcal F_{X_1,…,X_n}$,
    function we can get by restricting $\mathcal F$ to $X_1,…,X_n$

## (Vapnik-Chervonenkis dimension) VC dimension

maximum $n$ s.t. $\mathcal F$ can classify $X_1…,X_n$ completely correctly

- for function class $\mathcal F$ w/ VC dimension $d$
    $$
    \mathcal N(\mathcal F,n)<{n\choose d}
    $$
- ERM is consistence $⇔$ VC dimension finite
