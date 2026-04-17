# ZORA | Editorial Narrative & Design Archive

**ZORA** is a premium, high-impact digital magazine platform designed for the curation and preservation of fashion narratives and architectural design research. It is a full-scale editorial ecosystem focused on "Brutalist Minimalism" and high-end interaction design.

---

## Project Vision
ZORA is more than a content management system; it is a digital exhibition. It bridges the gap between fast-paced digital media and the structured permanence of physical print. The platform is built for curators, designers, and historians who seek a clutter-free, immersive reading experience.

## Key Features

### Editorial UI/UX
- **Brutalist Design System**: A sleek, monochrome aesthetic with high-impact typography and structured grids.
- **Dynamic Hero Slider**: A custom-built, auto-transitioning hero section featuring featured narratives and high-resolution imagery.
- **Split-Screen Detailed Previews**: Interactive "exhibition" views for gallery items and magazine collections, providing deep editorial context without leaving the page.
- **Museum-Grade Lightbox**: A custom-built focus view for fashion photoshoots.

### Full-Stack Capabilities
- **Admin Dashboard**: A secure, centralized hub for managing the entire editorial feed (Create, Edit, Delete).
- **Dynamic Event System**: A real-time filterable event list (Upcoming, Past, Virtual) with interactive UI updates.
- **Newsletter Integration**: A premium, success-state driven subscription module.
- **Responsive Architecture**: Fully optimized for diverse viewports, from mobile readers to high-resolution desktop displays.

## Tech Stack
- **Frontend**: EJS (Embedded JavaScript Templates), Vanilla CSS, Modern JavaScript (ES6+).
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB with Mongoose ODM.
- **Authentication**: Custom Authentication middleware and session management.
- **Optimization**: Vercel ready for high-performance serverless deployment.

---

## Getting Started

### Prerequisites
- Node.js (v14+)
- MongoDB (Local or Atlas)
- NPM or Yarn

### Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/yashpallohan/zora.git
   cd zora
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   PORT=3000
   ```

4. **Launch the platform**:
   ```bash
   npm start
   ```

---

## Repository Structure
```text
├── models/         # MongoDB Schemas (Post, User, Event)
├── public/         # Static assets (Images, CSS, Client JS)
├── routes/         # Express Route Handlers
├── views/          # EJS Templates (Home, Archive, Admin, etc.)
├── app.js          # Entry point & Express configuration
└── package.json    # Project metadata & dependencies
```

---

## License
Designed & Developed by Yashpal Lohan &bull; 2026