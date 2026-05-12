# Recruiter Dashboard - CSS Quick Reference

## Colors

### Primary
```
--linkedin-blue:      #0A66C2
--linkedin-dark:      #003D7A
--linkedin-light:     #E7F3FF
--linkedin-gray:      #F3F2EF
```

### Text
```
--linkedin-text:          #505050
--linkedin-text-light:    #8A8D91
```

### Borders & Accents
```
--linkedin-border:    #D3D3D3
--linkedin-shadow:    0 2px 4px rgba(0, 0, 0, 0.1)
--linkedin-shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.15)
```

## Spacing (8px Grid)

```
8px   = extra small
16px  = small
24px  = standard
32px  = large
```

## Typography

```
H1: 28px, weight 700
H2: 20px, weight 600
H3: 16px, weight 600
H4: 14px, weight 600
Body: 13px, weight 400
Small: 12px, weight 400
```

## Common Components

### Card
```html
<div class="card"></div>
```

### Button - Primary
```html
<button class="btn btn-primary">Button</button>
```

### Button - Secondary
```html
<button class="btn btn-secondary">Button</button>
```

### Input
```html
<input class="form-control" type="text">
```

### Badge
```html
<span class="badge badge-primary">Active</span>
```

### List Item
```html
<div class="list-item">
    <div class="item-avatar">JD</div>
    <div class="item-content">
        <div class="item-title">Title</div>
        <div class="item-subtitle">Subtitle</div>
    </div>
</div>
```

## Transitions
```scss
transition: var(--transition);  // all ease 0.2s
```

## Shadows
```scss
box-shadow: var(--linkedin-shadow);      // light
box-shadow: var(--linkedin-shadow-lg);   // medium
box-shadow: var(--linkedin-shadow-xl);   // heavy
```

## Borders
```scss
border-radius: 8px;    // standard
border-radius: 24px;   // button/pill
border-radius: 4px;    // small
border-radius: 50%;    // circle
```

## Responsive
```scss
@media (max-width: 768px) {
    // mobile styles
}

@media (min-width: 769px) {
    // desktop styles
}
```

## Common Patterns

### Hover Card
```scss
.card:hover {
    box-shadow: var(--linkedin-shadow-lg);
    border-color: var(--linkedin-blue);
    transform: translateY(-2px);
}
```

### Button with Icon
```html
<button class="btn btn-primary">
    <i class="ri-add-line"></i>
    Add
</button>
```

### Form Group
```html
<div class="form-group">
    <label class="form-label">Label</label>
    <input class="form-control">
</div>
```

### Table
```html
<table class="table">
    <thead>
        <tr>
            <th>Header</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Data</td>
        </tr>
    </tbody>
</table>
```

## Do's and Don'ts

✅ Use CSS variables
❌ Hardcode colors

✅ Follow 8px grid
❌ Use random spacing

✅ Apply transitions
❌ No animations everywhere

✅ Use semantic HTML
❌ Div spam

✅ Test mobile
❌ Desktop only

## Files to Know

- `src/styles.scss` - Global CSS variables
- `DESIGN_GUIDE.md` - Complete design documentation
- `modern-components.scss` - Reusable patterns
- `recruiter-dashboard.component.scss` - Main layout