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

objective:

$$
\min_{W,b}\frac{1}{2}\Vert W\Vert^2
\text{ s.t. } y_i(W^TX_i+b)\ge1
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

final objective

$$
\argmax_{\lambda_i\ge0}\hat L
$$

solution: sequential minimal optimization (SMO)

- fix all but 2 $\lambda_i$, and iterate
- 2 variable because $\sum_{i=1}^N\lambda_iy_i=0$

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
