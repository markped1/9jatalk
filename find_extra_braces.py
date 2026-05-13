with open(r'D:\9jaTalk\src\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Track depth and find where it's highest
depth = 0
max_depth = 0
max_line = 0
results = []

for i, line in enumerate(lines, 1):
    prev = depth
    for ch in line:
        if ch == '{': depth += 1
        elif ch == '}': depth -= 1
    if depth > max_depth:
        max_depth = depth
        max_line = i
    # Show lines where depth increases (potential unclosed braces)
    if depth > prev and depth > 6:
        results.append(f'Line {i} (depth={depth}, +{depth-prev}): {line.rstrip()[:120]}\n')

with open(r'D:\9jaTalk\extra_braces.txt', 'w', encoding='utf-8') as f:
    f.writelines(results)

print(f'Max depth: {max_depth} at line {max_line}')
print(f'Final depth: {depth}')
print(f'Found {len(results)} lines with depth > 6')
