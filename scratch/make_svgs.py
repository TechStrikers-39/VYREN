import os
from PIL import Image
import numpy as np

img = Image.open(r'c:\Users\Sarthak Deshpande\Desktop\SIH26 2nd Round\public\brand\vyren-symbol.png').convert('L')
arr = (np.array(img) > 0).astype(int)
H, W = arr.shape

visited = np.zeros((H, W), dtype=bool)
comps = []

for y in range(H):
    for x in range(W):
        if arr[y, x] and not visited[y, x]:
            c = []
            q = [(y, x)]
            visited[y, x] = True
            while q:
                cy, cx = q.pop()
                c.append((cx, cy))
                for dy in [-1, 0, 1]:
                    for dx in [-1, 0, 1]:
                        if dy == 0 and dx == 0: continue
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and arr[ny, nx] and not visited[ny, nx]:
                            visited[ny, nx] = True
                            q.append((ny, nx))
            if len(c) > 50:
                comps.append(c)

print(f'Found {len(comps)} polygon components')

def trace_outline(comp_pts):
    pts_set = set(comp_pts)
    start = min(comp_pts, key=lambda p: (p[1], p[0]))
    curr = start
    path = [curr]
    visited_pts = {curr}
    moves = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]
    while True:
        found = False
        cy, cx = curr
        for dy, dx in moves:
            ny, nx = cy + dy, cx + dx
            if (cx + dx, cy + dy) in pts_set:
                is_border = any(((cy+dy+my), (cx+dx+mx)) not in pts_set for my, mx in moves)
                if is_border:
                    if (cx + dx, cy + dy) not in visited_pts:
                        visited_pts.add((cx + dx, cy + dy))
                        curr = (cy + dy, cx + dx)
                        path.append(curr)
                        found = True
                        break
                    elif (cx + dx, cy + dy) == start and len(path) > 5:
                        return path
        if not found:
            break
    return path

svg_paths = []
for i, comp in enumerate(comps):
    out = trace_outline(comp)
    d = 'M ' + ' L '.join(f'{pt[0]},{pt[1]}' for pt in out) + ' Z'
    svg_paths.append(d)

print('Generated SVG paths:', len(svg_paths))

out_dir = r'c:\Users\Sarthak Deshpande\Desktop\SIH26 2nd Round\public\brand'
with open(os.path.join(out_dir, 'vyren-symbol.svg'), 'w') as f:
    f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" fill="currentColor">\n')
    for d in svg_paths:
        f.write(f'  <path d="{d}" />\n')
    f.write('</svg>\n')

with open(os.path.join(out_dir, 'vyren-symbol-dark.svg'), 'w') as f:
    f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" fill="#FFFFFF">\n')
    for d in svg_paths:
        f.write(f'  <path d="{d}" />\n')
    f.write('</svg>\n')

print('Saved vyren-symbol.svg and vyren-symbol-dark.svg successfully!')
