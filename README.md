# Emmanuel Moghalu -- Portfolio v2.0 🚀

A **production-grade, FAANG-level developer portfolio** engineered for
performance, accessibility, and visual storytelling.\
Built with a focus on **micro-interactions**, **responsive design**, and
**clean architecture**.

------------------------------------------------------------------------

## ✨ Key Features

### 🏗 Architecture & Design

- **Magnetic UI Physics** --- Custom hook-based magnetic pull effects
    on buttons and nav items.\
- **Bento Grid Layout** --- Apple-style modular grid powering the
    About section.\
- **Dynamic Island Navigation** --- Glassmorphic top-bar on desktop,
    floating island on mobile.\
- **Theme Awareness** --- Auto-detects system theme with local storage
    persistence and smooth transitions.

------------------------------------------------------------------------

## 🧩 Components

- **Hero Section**:\
    3D avatar tilt • typing effect • physics-based scroll cues.

- **Experience Timeline**:\
    "Spine" layout • metric-centric entries • expandable detail views.

- **Project Showcase**:\
    Filterable grid • framer-motion layout animations • modal
    deep-dives.

- **Contact Form**:\
    Split interface • real-time validation • animated "Border Beam"
    effect.

- **Easter Egg**:\
    Hidden **Konami Code** (↑ ↑ ↓ ↓ ← → ← → B A) triggering
    particle-physics confetti.

------------------------------------------------------------------------

## ⚡ Performance

- **Zero Layout Shift** --- Fixed-height containers & placeholders
    prevent CLS.\
- **Hardware-Accelerated Animations** --- Uses `transform` and
    `opacity` for smooth 60FPS.\
- **Optimized Assets** --- No heavy images; CSS noise & SVG animations
    keep the bundle lean.

------------------------------------------------------------------------

## 🛠 Tech Stack

  Category    Tools
  ----------- --------------------------
  Framework   **React (Vite)**
  Language    **TypeScript**
  Styling     **Tailwind CSS**
  Animation   **Framer Motion**
  Icons       **Lucide React**
  Utilities   `clsx`, `tailwind-merge`

------------------------------------------------------------------------

## 🚀 Getting Started

### **Prerequisites**

- Node.js **18+**
- npm or pnpm

------------------------------------------------------------------------

### **Installation**

``` bash
# Clone repository
git clone https://github.com/emmanuelrichard01/portfolio-v2.git
cd portfolio-v2

# Install dependencies
npm install
# or
pnpm install
```

------------------------------------------------------------------------

### **Run Development Server**

``` bash
npm run dev
```

### **Build for Production**

``` bash
npm run build
```

------------------------------------------------------------------------

## 📂 Project Structure

    src/
    ├── assets/               # Static images and textures
    ├── components/           # Reusable UI components
    │   ├── ui/               # Shadcn-like primitives (Button, Input, etc.)
    │   ├── Navbar.tsx        # Dynamic navigation system
    │   ├── Hero.tsx          # Hero section
    │   ├── About.tsx         # Bento grid "About" section
    │   ├── Projects.tsx      # Filterable project gallery
    │   ├── Experience.tsx    # Timeline component
    │   ├── Contact.tsx       # Contact form & logic
    │   └── EasterEgg.tsx     # Hidden achievement system
    ├── hooks/                # Custom React hooks
    │   ├── useKonamiCode.ts  # Easter egg logic
    │   └── use-toast.ts      # Toast notifications
    ├── lib/                  # Utility functions
    └── App.tsx               # Main entry point

------------------------------------------------------------------------

## 🔧 Configuration

### **Update Content**

- **Projects:** edit `PROJECTS_DATA` in\
    `src/components/Projects.tsx`

- **Experience:** edit `EXPERIENCE_DATA` in\
    `src/components/Experience.tsx`

- **Navigation:** update links inside\
    `src/components/Navbar.tsx`

------------------------------------------------------------------------

### **Customize the Easter Egg**

In `src/hooks/useKonamiCode.ts`:

``` ts
const KONAMI_CODE = ["ArrowUp", "ArrowUp", ...]; 
// Modify the sequence here
```

------------------------------------------------------------------------

## 🤝 Contributing

1. Fork the project\

2. Create a feature branch

    ``` bash
    git checkout -b feature/AmazingFeature
    ```

3. Commit changes

    ``` bash
    git commit -m "Add some AmazingFeature"
    ```

4. Push your branch

    ``` bash
    git push origin feature/AmazingFeature
    ```

5. Open a Pull Request

------------------------------------------------------------------------

## 📄 License

Distributed under the **MIT License**.\
See the `LICENSE` file for more information.

------------------------------------------------------------------------

```{=html}
<p align="center">
```

Built with ❤️ by `<strong>`{=html}Emmanuel Moghalu`</strong>`{=html}

```{=html}
</p>
```
