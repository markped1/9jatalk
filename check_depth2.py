with open(r'D:\9jaTalk\src\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

depth = 0
results = []
for i, line in enumerate(lines, 1):
    for ch in line:
        if ch == '{': depth += 1
        elif ch == '}': depth -= 1
    if i > 1800:
        results.append(f'Line {i} (depth={depth}): {line.rstrip()[:100]}\n')

with open(r'D:\9jaTalk\depth_output.txt', 'w', encoding='utf-8') as f:
    f.writelines(results)

print(f'Done. Final depth: {depth}. Output written to depth_output.txt')
