with open(r'D:\9jaTalk\src\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

depth = 0
for i, line in enumerate(lines, 1):
    for ch in line:
        if ch == '{': depth += 1
        elif ch == '}': depth -= 1
    if i > 1800:
        print(f'Line {i} (depth={depth}): {line.rstrip()[:100]}')
