<!-- toc -->

# Creating Perfect Grayscale-Gradient Colormaps

<style>
.content > main > * img {
    max-width: 40%;
    height: fit-content;
}
.content > main > p > img {
    display: block;
    margin: auto;
}
</style>

When reviewing the submission instruction for a conference,
I was reminded that the figures in my paper need to be "accessible" when
printed in grayscale.

Usually,
this would be done by adding patterns like triangles and circles in the plot.
However, we were plotting stacked areas like the left one below,
which contains dense and tiny vertical bars,
so a grayscale gradient seems to be our only option.
<div style="display: flex; align-items: center; justify-content: space-around;">
    <img src="https://github.com/SichangHe/internet_route_verification/assets/84777573/c3db5029-fa3c-470a-af22-feec7292f9ef"
        alt="Original stacked area plot example">
    <img src="https://github.com/SichangHe/sichanghe.github.io/assets/84777573/36bb2ed2-545a-4146-ae9a-ab1da07ebe4f"
        alt="Sequential Matplotlib colormaps">
</div>

I found nice grayscale-gradient "sequential" Matplotlib colormaps like the right
one above,
but they make it impossible to hand-pick a distinct and pretty color for
each category.

"This is not a big deal," I thought,
"I'll just use HSL (hue-saturation-lightness), set $s$ to $1$,
$l$ to a gradient,
and hand-pick the $h$." Except I was so wrong—lightness is not grayscale,
and figuring everything out took me the whole morning.

## Result: hand-picked hues and perfect grayscale gradient

After wasting an hour failing to find any implementation on the Internet,
I rolled my own scripts to calculate RGB color values from hue and grayscale,
which allowed hand-picking hues while still having perfect grayscale gradient:
<div style="display: flex; justify-content: space-around;">
    <img src="https://github.com/SichangHe/internet_route_verification/assets/84777573/6e18f178-3819-4d50-95b4-fc4a6ec46fa0"
        alt="Grayscale-gradient stacked area plot">
    <img src="https://github.com/SichangHe/internet_route_verification/assets/84777573/7de03ae0-1468-4922-b2d2-502843eb2de9"
        alt="Grayscale-gradient stacked area plot in grayscale">
</div>

Below is the definition of these six colors.
I hand-picked the hue values so each color looks natural,
but the grayscale values are sampled linearly.

```python
COLORS6: Final = tuple(
    hue_grayscale_to_srgb(hue, grayscale)
    for hue, grayscale in zip(
        [60, 180, 120, 240, 0, 300],
        np.linspace(0.96, 0.2, 6),
    )
)
```

As a trade-off, I spent some time doing math on a whiteboard.

## Math: calculating linear RGB from hue and grayscale

![Math for hue-grayscale to RGB conversion on a
whiteboard](https://github.com/SichangHe/internet_route_verification/assets/84777573/11f8ad38-403c-4e5d-99da-66176795223f)

After some Wikipedia'ing,
I extracted the formula for RGB-HSL and RGB-grayscale conversions,
and did the math on the whiteboard above.
For a color with linear red, green, blue values $r,g,b\in[0,1]$,
hue $h\in[0,360)$, saturation $s\in[0,1]$, lightness $l\in[0,1]$,
and grayscale $p\in[0,1]$:

$$
\begin{align*}
    x&:=\max\{r,g,b\}&\text{maximum RGB value}\\
    y&:=\text{mid}\{r,g,b\}&\text{middle RGB value}\\
    z&:=\min\{r,g,b\}&\text{minimum RGB value}\\
    c&:=x-z&\text{chroma}\\
    h&=:h'\cdot60°\\
    h'&=\begin{cases}
        \frac{g-b}{c}\mod 6&\text{if }x=r\\
        \frac{b-r}{c}+2&\text{if }x=g\\
        \frac{r-g}{c}+4&\text{if }x=b
    \end{cases}&\frac{1}{60}\text{hue}\\
    l&=\frac{x+z}{2}\\
    s&=\frac{c}{1-|2l-1|}&\text{if }l≠0,1\\
    R&:=0.2126,\quad G:=0.7152,\quad B:=0.0722b\\
    p&=Rr+Gg+Bb\\
\end{align*}
$$

Recall that we know $h$ and $p$, and want to solve for $r$, $g$, and $b$.
The easiest bit is exploiting saturation $s=1$ and the formula for it:

$$
1=\frac{x-z}{1-|2\frac{x+z}{2}-1|}
\Rightarrow\begin{cases}
    x=1&\text{if }x+z≥1\\
    z=0&\text{if }x+z<1\\
\end{cases}
$$

The many conditions of the hue is a source of nightmare for simplification.
Fortunately,
I observed the formula for $h'$ and found out only the order of
the three RGB values matters if I introduce a new variable $k$:

$$
\begin{align*}
    k&:=\begin{cases}
        6-h',&\text{ if }h'\in[5,6)&(\text{i.e. }r>b>g)\\
        h',  &\text{ if }h'\in[0,1)&(\text{i.e. }r>g>b)\\
        2-h',&\text{ if }h'\in[1,2)&(\text{i.e. }g>r>b)\\
        h'-2,&\text{ if }h'\in[2,3)&(\text{i.e. }g>b>r)\\
        4-h',&\text{ if }h'\in[3,4)&(\text{i.e. }b>g>r)\\
        h'-4,&\text{ if }h'\in[4,5)&(\text{i.e. }b>r>g)\\
    \end{cases}\\
    \Rightarrow k&=\frac{y-z}{x-z}
\end{align*}
$$

Since we can get the order of $r,g,b$ from $h$,
we can also know the grayscale coefficient $k_i$ for $i=x,y,z$.
For example, if $r>g>b$, then we have:

$$
x=r,\quad y=g,\quad z=b\\
k_x=R,\quad k_y=G,\quad k_z=B\\
\Rightarrow p=k_xx+k_yy+k_zz
$$

That is, we need to solve this linear system:

$$
\begin{align*}
    &\begin{cases}
        x=1&\text{if }x+z≥1\\
        z=0&\text{if }x+z<1\\
    \end{cases}\\
    &k=\frac{y-z}{x-z}\\
    &p=k_xx+k_yy+k_zz\\
    \Rightarrow&\begin{cases}
        x=\frac{p}{k_x+k_yk},&y=kx,&z=0&
        \text{if }x+z<1\\
        x=1,&y=(1-k)z+k,&z=\frac{p=k_x-k_yk}{k_y(1-k)+k_z}&
        \text{if }x+z≥1\\
    \end{cases}
\end{align*}
$$

This is then trivial to program.
[In the
code](https://github.com/SichangHe/internet_route_verification/blob/329ce168e18096188fcf2cf5f518e19eafe0ed61/scripts/scripts/fig/colors.py),
I first compute a potential answer using the first case,
then fall through to the second case if the resulting $x+z≥1$,
and then, boom! We have the RGB values from hue and grayscale.

…except we don't.

## Linear RGB vs standard RGB

RGB values computed from a linear grayscale gradient using the code above does not
produce a grayscale gradient.
In fact, I found some colors to have very similar grayscale.

This is because the RGB values we computed are linear RGB values,
and monitors use standard RGB (sRGB) instead, with the conversion:

$$
C_{\text{sRGB}}=\begin{cases}
    12.92C_{\text{linear}}&\text{if }C_{\text{linear}}≤0.0031308\\
    1.055C_{\text{linear}}^{1/2.4}-0.055&\text{if }C_{\text{linear}}>0.0031308
\end{cases}
$$

Why apply a weakly concave curve to RGB values?
It turns out that human eyes are less sensitive to changes in bright colors,
and so the curved sRGB values better reflect the perceived brightness.

Applying this knowledge to creating a grayscale gradient colormap,
we need to first generate the gradient in sRGB,
then convert each grayscale to linear RGB and apply the hue-grayscale to
linear RGB conversion, and finally convert them back to sRGB.
And, that is it!
A perfect grayscale-gradient colormap with hand-picked hues.
<div style="display: flex; justify-content: space-around;">
    <img src="https://github.com/SichangHe/internet_route_verification/assets/84777573/6e18f178-3819-4d50-95b4-fc4a6ec46fa0"
        alt="Grayscale-gradient stacked area plot">
    <img src="https://github.com/SichangHe/internet_route_verification/assets/84777573/7de03ae0-1468-4922-b2d2-502843eb2de9"
        alt="Grayscale-gradient stacked area plot in grayscale">
</div>

## Exercise for the reader

We fixed $s\equiv1$ above,
but what if we want to be able to change the saturation?
Can you solve the system for $r,g,b$ given $h,s,p$?

{{ #include footer.md }}

*2024-05-25*
