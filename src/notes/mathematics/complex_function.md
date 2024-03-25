<!-- toc -->
# Complex function

# logarithm

$$
\log z=\ln r+i\theta\\[12pt]
\text{Log }z=\ln r+i\Theta
$$

where $\Theta=\text{Arg }z$

- branch point $z=0$
- $e^{\log z}=z$
- $\log e^z\not\equiv z$
- multi-valued function $\log$
- $\log z_1z_2=\log z_1+\log z_2$
- $\text{Log }z_1z_2\not\equiv\text{Log }z_1+\text{Log }z_2$

## branch of logarithm

introduce $\alpha$ s.t.

$$
r>0,\quad
\alpha<\theta<\alpha+2\theta
$$

- branch cut $\theta=\alpha$, not continuous across
- principal branch $\alpha=-\pi$, branch cut for principal value
- branch point $z=0$, point common to all branch cut

## derivative of logarithm

$$
\frac{d}{dz}\log z=\frac{1}{z}
$$

- holomorphic

# exponential

$$
e^z=e^xe^{iy}=e^x\cos y+ie^x\sin y
$$

- nonzero
- periodic, $e^{z+i2\pi k}=e^z$
- entire function
- $(z_1z_2)^c\not\equiv z_1^cz_2^c$

## derivative of exponential

$$
\frac{d}{dz}c^z=c^z\text{Log }c
$$

# trigonometric function

$$
\sin z=\frac{e^{iz}-e^{-iz}}{2i},\quad
\cos z=\frac{e^{iz}+e^{-iz}}{2}
$$

- entire
- $\sin(iz)=i\sinh z,\quad\cos(iz)=\cosh z$

    $$
    ⇒ \sin z=\sin x\cosh y+i\cosh x\sin y\\[12pt]
    ⇒ |\sin z|^2=\sin^2x+\sinh^2y\\[12pt]
    ⇒ \sin z=0 ⇔ z=\pi k,k\in\Z
    $$

# hyperbolic function

$$
\sinh z=\frac{e^z-e^{-z}}{2},\quad
\cosh z=\frac{e^z+e^{-z}}{2}
$$

- $\sinh(iz)=i\sin z$

    $$
    ⇒ |\sinh z|^2=|i\sin(y-ix)|=\sinh^2x+\sin^2y\\[12pt]
    ⇒ \sinh z=0 ⇔ z=i\pi k,k\in\Z
    $$

# inverse trigonometric function

$$
\sin^{-1}z=-i\log \left(
    iz+\sqrt{1-z^2}
\right)\\
\cos^{-1}z=-i\log \left(
    z+i\sqrt{1-z^2}
\right)
$$

- $\log,\sqrt{}$ are multi-valued
- holomorphic in branch

## derivative of inverse trigonometric function

$$
\frac{d}{dz}\sin^{-1}z=\frac{1}{\sqrt{1-z^2}}\\[12pt]
\frac{d}{dz}\cos^{-1}z=-\frac{1}{\sqrt{1-z^2}}
$$

# Contour integral of power function on circle

$$
\int_{C_R}z^n\ dz=\begin{cases}
    0&n≠-1\\
    2\pi i&n=-1
\end{cases}
$$
