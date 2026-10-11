#!/usr/bin/env python3
"""Pixel-art pointing hand (index finger only), rasterized analytically so edges stay clean.
usage: dot-hand.py <angle-degrees> <out-name>   (positive angle = finger leans left)"""
import math, sys
ang = math.radians(float(sys.argv[1])); name = sys.argv[2]
N, SC, INK = 64, 1.4, "#303F9F"   # grid, dots per unit, outline colour
ca, sa = math.cos(ang), math.sin(ang)

def rrect(u, v, x0, y0, x1, y1, r):
    cx, cy, hw, hh = (x0+x1)/2, (y0+y1)/2, (x1-x0)/2, (y1-y0)/2
    qx, qy = abs(u-cx)-(hw-r), abs(v-cy)-(hh-r)
    return math.hypot(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - r

def hand(u, v):  # signed distance in hand units (negative = inside)
    return min(
        rrect(u, v, 6, 0, 11.5, 17, 2.6),      # index finger
        rrect(u, v, 11.5, 8.5, 16.5, 19, 2.2), # middle
        rrect(u, v, 16.5, 10, 21, 19, 2.2),    # ring
        rrect(u, v, 21, 12, 25.5, 20, 2.2),    # pinky
        rrect(u, v, 6, 14, 25.5, 27, 3),       # palm
        rrect(u, v, 0.5, 15, 9, 21, 2.8),      # thumb
        rrect(u, v, 8.5, 22, 24, 31, 2),       # wrist
    )

def divider(u, v):  # lines between fingers
    return (abs(u-11.5) < 0.45 and 9.5 < v < 16) or (abs(u-16.5) < 0.45 and 11 < v < 17) or (abs(u-21) < 0.45 and 13 < v < 18)

CX, CY = 13, 15.5  # hand centre in hand units
inside, div = set(), set()
for Y in range(N):
    for X in range(N):
        dx, dy = X+.5-N/2, Y+.5-N/2
        u = (dx*ca - dy*sa)/SC + CX
        v = (dx*sa + dy*ca)/SC + CY
        if hand(u, v) <= 0:
            inside.add((X, Y))
            if divider(u, v): div.add((X, Y))
# 1-dot outline: inside dots with a 4-neighbour outside, plus the finger dividers
edge = {(x, y) for x, y in inside if any((x+a, y+b) not in inside for a, b in ((1,0),(-1,0),(0,1),(0,-1)))}
ink = sorted(edge | div)
fill = sorted(inside - set(ink))
def rects(pts): return ''.join(f'<rect x="{x}" y="{y}" width="1" height="1"/>' for x, y in pts)
open(f'brand/{name}.svg', 'w').write(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}" width="1024" height="1024" shape-rendering="crispEdges">
  <!-- dot-style pointing hand (index finger). White fill hides what is underneath. -->
  <g fill="#ffffff">{rects(fill)}</g>
  <g fill="{INK}">{rects(ink)}</g>
</svg>
''')
