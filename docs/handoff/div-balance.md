# JSX Div Balance Checker

Use this script when making large block replacements in `Home.tsx` to verify that opening and closing `<div>` tags remain balanced.

## Stack-Tracing Script

```python
import re

with open('/home/ubuntu/infinity-calculator/client/src/pages/Home.tsx', 'r') as f:
    content = f.read()

stack = []
errors = []
lines = content.split('\n')

for i, line in enumerate(lines, 1):
    opens = len(re.findall(r'<div[\s>]', line))
    closes = len(re.findall(r'</div>', line))
    for _ in range(opens):
        stack.append(i)
    for _ in range(closes):
        if stack:
            stack.pop()
        else:
            errors.append(f"Line {i}: Unexpected </div>")

if stack:
    errors.append(f"Unclosed <div> tags opened at lines: {stack}")

if errors:
    print("ERRORS:")
    for e in errors:
        print(" ", e)
else:
    print(f"OK — all {len(lines)} lines balanced")
```

## Usage

Run before and after any large edit to `Home.tsx`:

```bash
python3.11 /tmp/check_divs.py
```

## Common Causes of Imbalance

- Replacing a multi-div block with a shorter one without counting closing tags
- Accidentally deleting a `</div>` at the end of a section
- Conditional rendering blocks (`{condition && <div>...</div>}`) where the closing tag is on a different line than expected

## Quick Count via Shell

```bash
grep -c '<div' /home/ubuntu/infinity-calculator/client/src/pages/Home.tsx
grep -c '</div>' /home/ubuntu/infinity-calculator/client/src/pages/Home.tsx
```

These counts should be equal (or very close — self-closing `<div />` counts as 1 open but 0 close).
