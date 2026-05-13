"""
Resolve git merge conflicts by keeping the HEAD (<<<<<<< HEAD) version.
"""
import re

def resolve_conflicts_keep_head(content):
    """
    Parse conflict blocks and keep only the HEAD side.
    A conflict block looks like:
        <<<<<<< HEAD
        ... HEAD content ...
        =======
        ... OTHER content ...
        >>>>>>> branch
    """
    result = []
    lines = content.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith('<<<<<<< '):
            # Start of conflict — collect HEAD side
            head_lines = []
            i += 1
            while i < len(lines) and not lines[i].startswith('======='):
                head_lines.append(lines[i])
                i += 1
            # Skip past =======
            i += 1
            # Skip OTHER side until >>>>>>>
            while i < len(lines) and not lines[i].startswith('>>>>>>> '):
                i += 1
            # Skip >>>>>>> line
            i += 1
            result.extend(head_lines)
        else:
            result.append(line)
            i += 1
    return '\n'.join(result)

files = [
    r'D:\9jaTalk\src\App.tsx',
    r'D:\9jaTalk\src\services\firebase.ts',
    r'D:\9jaTalk\src\services\agora.ts',
]

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    conflicts_before = content.count('<<<<<<< HEAD')
    if conflicts_before == 0:
        print(f'{path}: no conflicts, skipping')
        continue
    
    resolved = resolve_conflicts_keep_head(content)
    conflicts_after = resolved.count('<<<<<<< HEAD')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(resolved)
    
    print(f'{path}: resolved {conflicts_before} conflicts (remaining: {conflicts_after})')

print('Done.')
