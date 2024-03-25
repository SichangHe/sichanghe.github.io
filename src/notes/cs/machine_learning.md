<!-- toc -->
# Machine Learning

## general problem format

given input $A$, want output $y\in Y$

$$
f:A\rightarrow Y
,\qquad
y=f(a)\in Y
\quad\text{for }a\in A
$$

- traditional approach\
    hand-craft the function $f$
- machine learning\
    build another function $\lambda$ and use it to generate
    an approximation $f$

## machine learning is about building a function

- training data $L=\{(a_1,y_1),\cdots,(a_n,y_n)\}$
- class of allowed function $\mathcal F$

use a predefined algorithm to compute $f\in\mathcal F$ with the goal:

$$
y\approx f(x)
$$

### simplification using feature vector

convert input into a 1d vector, making machine learning generally applicable

- feature vector $\vec x\in X\subseteq\R^d$
- $\phi:A\rightarrow X$
- training set $T_a=\{(\vec x_1,y_1),\cdots,(\vec x_n,y_n)\}\subset\R^d\times\R^e$
- hypothesis space $\mathcal H$
- $Y\subseteq\R^e$

predefined algorithm produce $h\in\mathcal H$ so that

$$
f(a)=h(\phi(a))
$$

## loss

estimation of the error of $h$

$$
\ell:Y\times Y\rightarrow\R^+
\\[12pt]
\ell(y_n,h(\vec x_n))
$$

### zero-one loss

$$
\ell(y,\hat y):=\begin{cases}
    0&y=\hat y\\
    1&\text{otherwise}
\end{cases}
$$

### quadratic loss

$$
\ell(y,\hat y):=(y-\hat y)^2
$$

## empirical risk

average lost based on the training set

$$
L_T(h):=\frac{1}{N}\sum_{n=1}^N\ell(y_n,h(\vec x_n))
$$

## three types of machine learning problems

### classification problem

label given data

- classifier (predictor) $h$: the produced function

#### all possible training set

$$
\mathcal T:=2^{X\times Y}
$$

#### signature of machine learning function $\lambda$

$$
\lambda:\mathcal T\rightarrow\mathcal H
\quad\text{such that}\quad
\lambda(T)=h
$$

- $\lambda$ learn (or train) classifier $h$ from training set $T$
- inference: apply classifier $h$ on any data
    - testing: apply classifier $h$ on unseen data

#### classifier $h$ define a partition of $X$

### regression problem

given data, return a vector

### clustering problem

group given data

## supervised/ unsupervised machine learning

supervised learning: classification, regression

unsupervised learning: clustering

# polynomial data fitting

not machine learning but similar

$$
A\vec c=\vec b\\[12pt]
A=\begin{bmatrix}
    1&x_1&\cdots&x_1^k\\
    \vdots&\vdots&&\vdots\\
    1&x_N&\cdots&x_N^k
\end{bmatrix}\\[12pt]
\vec b=\begin{bmatrix}
    y_1\\\vdots\\y_N
\end{bmatrix}\\[12pt]
\hat{\vec c}\in\argmin_{\vec c}\|A\vec c=\vec b\|^2
$$

- number of monomial $m(d,k)={d+k\choose k}$

## interpolation in polynomial data fitting

achieve $0$ loss

- $k=N-1 ⇒$ always interpolate
- overfitting

# k-nearest neighbors predictor

remember the whole training set

$$
T=\{(\vec x_i,y_i)|i=1,\cdots,N\}
$$

return average of $y_n$s corresponding to
the $k$ closest $\vec x_n$s to $\vec x$

- useful for both classification and regression
- smaller $k$ results in worse overfitting
- good interpolation and poor extrapolation

## Voronoi diagram

![example of a Voronoi diagram](https://www.baeldung.com/wp-content/uploads/sites/4/2021/11/plotcrop-768x768.png)

# gradient descent

## stochastic gradient descent (SGD)

group training set randomly into mini-batch,
use gradient from each mini-batch to descent

- mini-step are in the right direction on average
- epoch: using all data once

## step size

- fixed
- decreasing
- momentum

    $$
    \vec v_{k+1}=\mu_k\vec v_k-\alpha_k\nabla f(\vec z_k)
    $$

- line search

## subgradient

# logistic-regression classifier

- score-based

## score function for linear boundary

$$
s(\vec x)=\sigma(a(\vec x))=\sigma(c+\vec u^T\vec x)
$$

## signed distance to hyperplane

hyperplane $\chi\in\R^d$

$$
b+\vec w^T\vec x=0
\qquad\vec w≠\vec 0
$$

- $\vec w$ is perpendicular to $\chi$
- distance of $\chi$ from origin

    $$
    \beta:=\frac{|b|}{\|\vec w\|}
    $$

- signed distance of $\vec x$ from $\chi$

    $$
    \Delta(\vec x):=\frac{b+\vec w^T\vec x}{\|\vec w\|}
    $$

## logistic function

$$
f(\Delta):=\frac{1}{1+e^{-\Delta}}
$$

![logistic function](https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Logistic-curve.svg/800px-Logistic-curve.svg.png)

then the score function is

$$
s(\vec x):=f(a(\vec x))=f(b+\vec w^T\vec x)=
\frac{1}{1+e^{-b-\vec w^T\vec x}}
$$

- activation $a(\vec x)$ is signed distance scaled

### softmax function

softmax function in activation $\vec a$

$$
\vec s(\vec x)=\begin{bmatrix}
    s_1(\vec a)\\\vdots\\s_K(\vec a)
\end{bmatrix}\\[12pt]
\vec a(\vec x)=\begin{bmatrix}
    a_1(\vec x)\\\vdots\\a_K(\vec x)
\end{bmatrix}\\[12pt]
s_k(\vec x)=f(a_k(\vec x))=
\frac{e^{a_k}(\vec x)}{\sum_{j=1}^Ke^{a_j}(\vec x)}
$$

## cross entropy loss for binary classification

cross entropy loss of assigning score $p$ to point whose true label is $y$

$$
\ell(y,p):=\begin{cases}
    -\log p&y=1\\
    -\log(1-p)&y=0\\
\end{cases}\\[12pt]=
-y\log p-(1-y)\log(1-p)
$$

- differentiable so we can do gradient descent
- base of $\log$ does not matter
- resulting risk function is weakly convex

### cross entropy loss for $K$-class case

$$
\ell(y,\vec p)=-\log p_y=-\sum_{k=1}^Kq_k\log p_k
$$

- true label $y$
- prediction $\vec p$
- one hot encoding $\vec q$ of $y$

# support vector machine (SVM)

## binary support vector machine

### separating hyperplane for binary support vector machine

$$
\vec n^T\vec x+c=0\\[12pt]
\vec n\in\R^d,\quad\|\vec n\|=1,\quad c\in\R
$$

- decision rule

    $$
    h(\vec x)=\text{sign}(\vec n^T\vec x+c)\\[12pt] ⇒
    y(\vec n^T\vec x+c)≥0
    $$

- margin for $(\vec x,y)$ with parameter $\vec v=(\vec n,c)$

    $$
    \mu_{\vec v}(\vec x,y):=y(\vec n^T\vec x+c)
    $$

    - margin $\mu_{\vec v}(T)$ of training set

        $$
        \mu_{\vec v}(T):=\min_{(\vec x,y)\in T}\mu_{\vec v}(\vec x,y)
        $$

    - linearly separable if $\mu_{\vec v}(T)>0$

### hinge loss

reference margin $\mu^*>0$

$$
\ell_{\vec v}(\vec x,y):=
\frac{1}{\mu*}\max\{0,\mu^*-\mu_{\vec v}(\vec x,y)\}\\[12pt]=
\max\{0,1-y(\vec w^T\vec x+b)\}
$$

where

$$
\vec w:=\frac{\vec n}{\mu^*},\quad b=\frac{c}{\mu^*}
$$

- separating hyperplane $\vec w^T\vec x+b=0$

#### empirical risk of binary support vector machine

$$
L_T(\vec w,b):=
\frac{1}{2}\|\vec w\|^2+
\frac{C_0}{N}\sum_{n=1}^N\ell_{(\vec w,b)}(\vec x_n,y_n)
$$

- bigger $C_0 ⇒$ smaller $\mu^*$

## soft linear support vector machine

$$
(\vec w^*,b^*)=\text{ERM}_T(\vec w,b)
$$

### subgradient of hinge function

$$
\rho(z)=\max\{0,z\}\\[12pt]
\rho'(z)=\begin{cases}
    1&z>0\\
    0&\text{otherwise}
\end{cases}
$$

## support vector machine with kernel

### representer theorem

$∀$ loss function in the form

$$
L^T(\vec w,b)=R(\|\vec w\|)+S(\vec w^T\vec x_1+b,\cdots,\vec w^T\vec x_N+b)
$$

where $R:\R_+ → \R$ increasing, $S:\R^N → \R$,

$∃\ \beta_1,\cdots\beta_N$ s.t.

$$
\vec w^*=\sum_{n=1}^N\beta_n\vec x_n
$$

- proof: by writing

    $$
    \vec w^*=\sum_{n=1}^N\beta_n\vec x_n+\vec u\quad
    \text{for some}\quad\vec u\in\text{span}\{\vec x_i\}
    $$

    and proving $\vec u=\vec 0$ by contradiction

### support vector

sample that are misclassified or classified correctly with
a margin not larger than $\mu^*$

only support vector contribute to $\vec w^*,b^*$

$$
h(\vec x)=\text{sign}\left(
    \sum_{n=1}^N\beta_n\color{darkred}\vec x_n^T\vec x\color{unset}+b^*
\right)\\[12pt]
L^T(\vec w,b)=
\frac{1}{2}\sum_{n=1}^N
\beta_m\beta_n\color{darkred}\vec x_n^T\vec x_n\color{unset}+
\frac{C_0}{N}\sum_{n=1}^N\rho \left(
    1-y_n \left(
        \sum_{n=1}^N\beta_m\color{darkred}\vec x_n^T\vec x_n\color{unset}+b
    \right)
\right)
$$

### kernel for support vector machine

$$
h(\vec x)=\text{sign}\left(
    \sum_{n=1}^N\beta_n\color{darkred}K(\vec x_n,\vec x)\color{unset}+b^*
\right)\\[12pt]
L^T(\vec w,b)=
\frac{1}{2}\sum_{n=1}^N
\beta_m\beta_n\color{darkred}K(\vec x_n,\vec x_n)\color{unset}+
\frac{C_0}{N}\sum_{n=1}^N\rho \left(
    1-y_n \left(
        \sum_{n=1}^N\beta_m\color{darkred}K(\vec x_n,\vec x_n)\color{unset}+b
    \right)
\right)
$$

where kernel $K$

$$
K(\vec x,\vec\xi):=\vec\varphi(\vec x)\vec\varphi(\vec\xi)
$$

for some $\vec\varphi$

- $K(\vec x,\vec\xi)=K(\vec\xi,\vec x)$
- $K^2(\vec x,\vec\xi)≤K(\vec x,\vec x)K(\vec\xi,\vec\xi)$

$K$ is a kernel of $\{\vec x_i\}$

- $⇔ C≥0$ where $C_{ij}=K(\vec x_i,\vec x_j)$
- $⇔$ Mercer's condition: $∀\ f:\R^d → \R$ s.t.

    $$
    \int_{\R^d}f(\vec x)d\vec x
    $$

    is finite,

    $$
    \int_{\R^d\times\R^d}K(\vec x,\vec\xi)f(\vec x)f(\vec\xi)d\vec xd\vec\xi≥0
    $$

- Gaussian kernel

    $$
    K(\vec x,\vec\xi)=e^{-\frac{\|\vec x-\vec\xi\|^2}{\sigma^2}}
    $$

    - radial basis function (RBF) SVM