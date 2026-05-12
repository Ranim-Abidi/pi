# Quick Start Guide for Developers

## 🚀 Get Started in 5 Minutes

### 1. Understand the Structure (1 min)
```
Recruiter Dashboard Layout:
┌─────────────────────────────────────────┐
│         HEADER (64px, white)            │
├──────────────┬────────────────────────────┤
│   SIDEBAR    │   MAIN CONTENT (fluid)    │  
│  (260px,     │   • Stats cards            │
│   blue)      │   • Lists                  │
│              │   • Tables                 │
│              │   • Forms                  │
├──────────────┴────────────────────────────┤
│         FOOTER (links)                  │
└─────────────────────────────────────────┘
```

### 2. Know the Colors (1 min)
```scss
// 3 colors get you 90% done:
--linkedin-blue:    #0A66C2  (primary, buttons, links)
--linkedin-dark:    #003D7A  (headings)
--linkedin-gray:    #F3F2EF  (backgrounds)
--linkedin-border:  #D3D3D3  (dividers)
--linkedin-text:    #505050  (body text)
```

### 3. Learn the Spacing (1 min)
```scss
// Only 4 values:
8px    // Between elements (icons, gaps)
16px   // Component padding (cards, inputs)
24px   // Page padding (sections)
32px   // Large sections

// Rule: All spacing MUST be multiples of 8px
```

### 4. Copy Component Patterns (1 min)
```scss
// Card pattern
.card {
    background: white;
    border: 1px solid var(--linkedin-border);
    border-radius: 8px;
    box-shadow: var(--linkedin-shadow);
    padding: 16px;
    transition: var(--transition);

    &:hover {
        box-shadow: var(--linkedin-shadow-lg);
    }
}

// Button pattern
.btn {
    border-radius: 24px;
    padding: 10px 24px;
    font-weight: 600;
    transition: var(--transition);

    &-primary {
        background: var(--linkedin-blue);
        color: white;

        &:hover {
            background: var(--linkedin-dark);
            transform: translateY(-1px);
        }
    }
}
```

### 5. Test Responsiveness (1 min)
```scss
// Always include mobile styles
@media (max-width: 768px) {
    .component {
        // Mobile-specific adjustments
        padding: 12px;  // Reduce padding
        width: 100%;    // Full width
    }
}
```

## 📌 Quick Reference

### Colors
```
Primary Blue:     var(--linkedin-blue)      #0A66C2
Dark Blue:        var(--linkedin-dark)      #003D7A
Light Blue:       var(--linkedin-light)     #E7F3FF
Background:       var(--linkedin-gray)      #F3F2EF
Text:             var(--linkedin-text)      #505050
Light Text:       var(--linkedin-text-light) #8A8D91
Border:           var(--linkedin-border)    #D3D3D3
```

### Shadows
```
Light:    var(--linkedin-shadow)      0 2px 4px rgba(0,0,0,0.1)
Medium:   var(--linkedin-shadow-lg)   0 4px 12px rgba(0,0,0,0.15)
Heavy:    var(--linkedin-shadow-xl)   0 8px 20px rgba(0,0,0,0.12)
```

### Transitions
```scss
transition: var(--transition);  // All 0.2s ease
```

## 🔨 Common Tasks

### Create a New Card Component
```html
<!-- card.component.html -->
<div class="card">
    <div class="card-header">
        <h4>{{ title }}</h4>
    </div>
    <div class="card-body">
        <ng-content></ng-content>
    </div>
</div>
```

```scss
// card.component.scss
.card {
    background: white;
    border: 1px solid var(--linkedin-border);
    border-radius: 8px;
    box-shadow: var(--linkedin-shadow);
    overflow: hidden;
    transition: var(--transition);

    &:hover {
        box-shadow: var(--linkedin-shadow-lg);
    }

    .card-header {
        padding: 16px;
        border-bottom: 1px solid var(--linkedin-border);

        h4 {
            margin: 0;
            color: var(--linkedin-dark);
            font-weight: 600;
            font-size: 14px;
        }
    }

    .card-body {
        padding: 16px;
    }
}
```

### Add a New Button Style
```scss
.btn-custom {
    background: var(--linkedin-blue);
    color: white;
    border: none;
    border-radius: 24px;
    padding: 10px 24px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: var(--transition);

    &:hover {
        background: var(--linkedin-dark);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(10, 102, 194, 0.3);
    }

    &:active {
        transform: translateY(0);
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
}
```

### Create a List with Avatars
```html
<div class="list-item">
    <div class="item-avatar">{{ initials }}</div>
    <div class="item-content">
        <div class="item-title">{{ name }}</div>
        <div class="item-subtitle">{{ subtitle }}</div>
    </div>
    <div class="item-action">
        <button class="btn btn-sm">Action</button>
    </div>
</div>
```

```scss
.list-item {
    display: flex;
    align-items: center;
    padding: 12px;
    border-bottom: 1px solid var(--linkedin-border);
    transition: var(--transition);
    cursor: pointer;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: #FAFAF9;
    }

    .item-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--linkedin-gray);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        color: var(--linkedin-blue);
        margin-right: 12px;
        flex-shrink: 0;
    }

    .item-content {
        flex: 1;

        .item-title {
            font-weight: 600;
            color: var(--linkedin-dark);
            margin: 0 0 4px 0;
        }

        .item-subtitle {
            font-size: 12px;
            color: var(--linkedin-text-light);
            margin: 0;
        }
    }

    .item-action {
        margin-left: 12px;
    }
}
```

## ✅ Pre-Launch Checklist

- [ ] Colors match the design guide
- [ ] Spacing follows 8px grid
- [ ] Hover states work
- [ ] Mobile layout is tested
- [ ] Tablet layout is tested
- [ ] Desktop layout is tested
- [ ] No console errors
- [ ] Performance is good
- [ ] Accessibility passes (WCAG AA)
- [ ] Component is reusable

## 🐛 Debug Tips

### Colors not showing?
```scss
// Check you're using CSS variables, not hardcoded colors
color: var(--linkedin-blue);     // ✅ Good
color: #0A66C2;                   // ❌ Bad
```

### Layout looks weird?
```scss
// Check media queries and grid
@media (max-width: 768px) {
    // Your mobile styles
}
```

### Shadows too dark?
```scss
// Use one of three shadow variables
box-shadow: var(--linkedin-shadow);      // Light (default)
box-shadow: var(--linkedin-shadow-lg);   // Medium (hover)
box-shadow: var(--linkedin-shadow-xl);   // Heavy (modals)
```

### Spacing inconsistent?
```scss
// Make sure all values are multiples of 8
padding: 16px;   // ✅ Good
padding: 15px;   // ❌ Bad
margin: 24px;    // ✅ Good
margin: 20px;    // ❌ Bad
```

## 📚 Where to Look

| Need | Look Here |
|------|-----------|
| Colors | CSS_QUICK_REFERENCE.md |
| Spacing | IMPLEMENTATION_GUIDE.md |
| Components | modern-components.scss |
| Examples | DASHBOARD_TEMPLATE.html |
| Full Guide | DESIGN_GUIDE.md |
| Patterns | recruiter-dashboard components |

## 🎯 Do It Right First Time

✅ Use CSS variables
✅ Follow 8px grid
✅ Apply transitions
✅ Test on mobile
✅ Keep it simple

❌ Hardcode colors
❌ Use random spacing
❌ Add excessive animations
❌ Desktop-only testing
❌ Over-complicate things

## 🚀 You're Ready!

You now have everything needed to:
- ✅ Create professional components
- ✅ Style things correctly
- ✅ Make responsive layouts
- ✅ Keep consistency
- ✅ Follow best practices

**Happy coding!** 🎉

---

Need more details? Check:
- `DESIGN_GUIDE.md` - Complete system
- `IMPLEMENTATION_GUIDE.md` - Step-by-step
- `DASHBOARD_TEMPLATE.html` - Real examples
- `modern-components.scss` - Code patterns
