with open(r'D:\9jaTalk\src\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find lines where depth increases unexpectedly near the end
depth = 0
results = []
for i, line in enumerate(lines, 1):
    prev = depth
    for ch in line:
        if ch == '{': depth += 1
        elif ch == '}': depth -= 1
    delta = depth - prev
    # Show lines where depth changes near the end of file
    if i > 1340 and i < 1360:
        results.append(f'Line {i} (depth={depth}, delta={delta:+d}): {line.rstrip()[:120]}\n')

with open(r'D:\9jaTalk\imbalance_output.txt', 'w', encoding='utf-8') as f:
    f.writelines(results)

print(f'Done. Final depth: {depth}')
