# Recruiter Dashboard - Modern Professional Design Guide

## Design Philosophy
Modern, clean, professional SaaS aesthetic inspired by LinkedIn. Focus on usability, clarity, and professional appearance with minimal visual clutter.

## Color Palette

### Primary Colors
- **LinkedIn Blue** `#0A66C2` - Primary brand color, buttons, links, interactive elements
- **LinkedIn Dark** `#003D7A` - Headings, text emphasis, hover states
- **LinkedIn Light** `#E7F3FF` - Subtle backgrounds, highlights
- **LinkedIn Gray** `#F3F2EF` - Main background color

### Secondary Colors (Matchy Khedma)
- **Orange** `#F08A4F` - Accent color for highlights and secondary actions
- **Orange Light** `#F4B8A0` - Disabled/secondary accent states

### Neutral Colors
- **Text Dark** `#505050` - Main body text
- **Text Light** `#8A8D91` - Secondary text, labels
- **Border** `#D3D3D3` - Subtle borders and dividers
- **White** `#FFFFFF` - Card backgrounds and contrast elements

## Typography

### Font Stack
- **Font Family**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', sans-serif`
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- **Base Font Size**: 13px (professional SaaS standard)

### Typography Scale
- **H1**: 28px, weight 700 (page titles)
- **H2**: 20px, weight 600 (section headers)
- **H3**: 16px, weight 600 (subsection headers)
- **H4**: 14px, weight 600 (card titles)
- **Body**: 13px, weight 400 (main text)
- **Small**: 12px, weight 400 (labels, secondary text)

## Spacing & Layout

### Spacing System (8px base)
- **8px** - Extra small gaps (icon spacing)
- **16px** - Small padding (button padding, card padding)
- **24px** - Standard padding (page padding, section margins)
- **32px** - Large spacing (between major sections)

### Layout Grid
- **Sidebar Width**: 260px (fixed, dark blue)
- **Header Height**: 64px (fixed, white)
- **Main Content**: Full width - 260px (fluid)
- **Max Content Width**: None (full width to sidebar)
- **Responsive Breakpoint**: 768px (mobile)

### Border Radius
- **Standard**: 8px (cards, buttons, inputs)
- **Rounded**: 24px (buttons with rounded pill style)
- **Mini**: 4px (small accents)

## Component Styling

### Header (`rd-header`)
- **Background**: White (`#FFFFFF`)
- **Border**: 1px solid Light Gray (`#D3D3D3`)
- **Height**: 64px (fixed position)
- **Shadow**: `0 2px 4px rgba(0, 0, 0, 0.1)`
- **Logo Height**: 36px
- **Typography**: Dark text, clean layout

#### Header Features
- Fixed positioning at top
- Logo + app title on left
- User welcome message on right
- Clean, minimal visual design
- Smooth shadows for depth

### Sidebar (`rd-sidebar`)
- **Background**: LinkedIn Blue (`#0A66C2`)
- **Width**: 260px (fixed)
- **Position**: Fixed, left side
- **Text Color**: White with 80% opacity
- **Hover**: 10% lighter white background
- **Active State**: Highlighted with orange left border
- **Icons**: 18px, flex-centered

#### Sidebar Styling
```scss
// Navigation items
a {
  padding: 12px 16px;
  display: flex;
  gap: 12px;
  color: rgba(255, 255, 255, 0.8);
  border-left: 3px solid transparent;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
  
  &.active {
    border-left-color: #F7A623;
    background: rgba(255, 255, 255, 0.15);
  }
}
```

### Cards & Containers
- **Background**: White (`#FFFFFF`)
- **Border**: 1px solid Light Gray (`#D3D3D3`)
- **Border Radius**: 8px
- **Shadow**: `0 2px 4px rgba(0, 0, 0, 0.1)`
- **Padding**: 16px (body), 12-16px (header)
- **Hover**: Lift effect with enhanced shadow

#### Card Enhancements
- Smooth transitions (0.2s)
- Subtle 2px lift on hover
- Enhanced shadow on hover: `0 4px 12px rgba(0, 0, 0, 0.15)`
- Left accent bar (3px) for section titles

### Buttons

#### Primary Button
- **Background**: LinkedIn Blue (`#0A66C2`)
- **Color**: White
- **Padding**: 10px 24px
- **Border Radius**: 24px
- **Font Weight**: 600
- **Font Size**: 13px

#### Primary Button Hover/Active
- **Background**: LinkedIn Dark (`#003D7A`)
- **Transform**: translateY(-1px) (lift effect)
- **Shadow**: `0 4px 12px rgba(10, 102, 194, 0.3)`

#### Secondary Button
- **Background**: Transparent/Gray
- **Color**: LinkedIn Blue
- **Border**: 1px solid LinkedIn Blue
- **Hover**: Light blue background

### Form Controls
- **Border**: 1px solid Light Gray (`#D3D3D3`)
- **Border Radius**: 6px
- **Padding**: 10px 12px
- **Font Size**: 13px
- **Focus State**: 
  - Border: LinkedIn Blue
  - Shadow: `0 0 0 3px rgba(10, 102, 194, 0.1)`

### Tables
- **Header Background**: Light gray (#F3F2EF)
- **Header Font Weight**: 600
- **Row Hover**: Light gray background (#FAFAF9)
- **Borders**: 1px solid Light Gray between rows
- **Padding**: 12px 16px (cells)

### Statistics Cards
- **Layout**: Grid (auto-fit, 200px minimum)
- **Left Border**: 4px solid LinkedIn Blue
- **Hover**: 
  - Shadow enhancement
  - 2px lift (translateY)
  - Border color lightening

## Shadows & Elevation

### Shadow Scales
- **Light**: `0 2px 4px rgba(0, 0, 0, 0.1)` - Default cards
- **Medium**: `0 4px 12px rgba(0, 0, 0, 0.15)` - Hovered cards
- **Heavy**: `0 8px 20px rgba(0, 0, 0, 0.12)` - Modals/dropdowns

## Transitions & Animations

### Duration
- **Fast**: 0.15s (small interactions)
- **Standard**: 0.2s (normal state changes)
- **Slow**: 0.3s (major transitions)

### Easing
```scss
transition: all ease 0.2s;
```

### Common Animations
- **Hover Lift**: `transform: translateY(-2px)`
- **Focus**: Shadow + border color change
- **Active**: `transform: translateY(0)`

## Responsive Design

### Mobile (≤ 768px)
- **Sidebar**: Hidden by default, slide-in on menu toggle
- **Header**: Adjusted padding (16px), height 56px
- **Main Content**: Full width
- **Cards**: Stack vertically, full width
- **Padding**: Reduced to 16px

### Tablet (769-1024px)
- **Sidebar**: 260px (same)
- **Main Content**: Responsive
- **Card Grid**: 2 columns

### Desktop (≥ 1025px)
- **Sidebar**: 260px fixed
- **Main Content**: Calculator width
- **Card Grid**: 3-4 columns based on content

## Accessibility

### Color Contrast
- Text on White: WCAG AA compliant
- Text on Blue: White text, high contrast
- Focus states: Clearly visible with blue outline

### Interactive Elements
- **Minimum Touch Size**: 44x44px (buttons, links)
- **Focus Indicators**: Blue outline, 2px
- **Hover States**: Clear visual feedback

## CSS Variables Usage

All colors and transitions are defined in `:root`:
```css
--linkedin-blue: #0A66C2;
--linkedin-dark: #003D7A;
--linkedin-light: #E7F3FF;
--linkedin-gray: #F3F2EF;
--linkedin-text: #505050;
--linkedin-text-light: #8A8D91;
--linkedin-border: #D3D3D3;
--linkedin-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
--transition: all ease 0.2s;
```

## Files Updated
1. `src/styles.scss` - Global CSS variables and typography
2. `rd-header/rd-header.component.scss` - Header styling
3. `rd-sidebar/rd-sidebar.component.scss` - Sidebar navigation
4. `rd-footer/rd-footer.component.scss` - Footer styling
5. `recruiter-dashboard.component.scss` - Main layout and typography
6. `rd-dashboard/rd-dashboard.component.scss` - Cards and statistics

## Best Practices

✅ **DO:**
- Use CSS variables for all colors
- Apply transitions for smooth interactions
- Use semantic HTML with proper hierarchy
- Maintain consistent spacing (8px grid)
- Test on mobile and desktop
- Use accessible color contrasts
- Apply subtle shadows for depth
- Keep interactions responsive (< 300ms)

❌ **DON'T:**
- Use `!important` flags (use CSS specificity instead)
- Apply harsh shadows or colors
- Use animations that distract
- Create inconsistent spacing
- Forget mobile responsiveness
- Use text-only buttons without proper sizing
- Apply multiple competing shadows
- Use overly bright or harsh colors

## Modern UI Patterns

### Micro-interactions
- Hover card lift (translateY)
- Button focus states with shadow
- Input focus with colored border
- Smooth transitions on all state changes

### Visual Hierarchy
- Dark blue for primary headings
- Medium gray for secondary text
- Small caps for labels
- Icon + text combinations

### Card Pattern
- White background with subtle border
- Left accent bar for emphasis
- Consistent padding throughout
- Hover effects for interactivity

### Table Pattern
- Sticky header with gray background
- Row hover highlighting
- Proper spacing and alignment
- Clear visual structure
- ✅ Use smooth transitions (0.3s) for better UX
- ✅ Ensure sufficient contrast for accessibility
- ✅ Keep spacing and padding consistent (25px standard in cards)
- ✅ Use gradient backgrounds for visual hierarchy
- ✅ Apply drop shadows for depth perception

### Responsive Design
- Mobile breakpoint: 767px and below
- Sidebar becomes horizontal on mobile
- Padding adjusts for smaller screens
- Touch-friendly button sizes maintained

---
**Created**: March 2026
**Brand**: Matchy Khedma - Connexion & Carrière
