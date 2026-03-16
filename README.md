<p align="center">
  <img src="public/image/pixel_title.png" width="1000" alt="Aniblaze" />
</p>

<p align="center">
  <strong>Episodes On Demand — Ultimate Anime Experience</strong>
</p>

---

# 📺 Demo Video
> [!TIP]
> Click the placeholder below or add your video URL to see the app in action!

[![Aniblaze Demo](https://img.youtube.com/vi/REPLACE_WITH_VIDEO_ID/0.jpg)](https://www.youtube.com/watch?v=REPLACE_WITH_VIDEO_ID)

---

# 📸 Screenshots

<p align="center">
  <img src="public/screenshots/home.png" width="45%" alt="Home Page" />
  <img src="public/screenshots/search.png" width="45%" alt="Search Results" />
</p>
<p align="center">
  <img src="public/screenshots/watch.png" width="45%" alt="Watch Page" />
  <img src="public/screenshots/mobile.png" width="45%" alt="Mobile View" />
</p>

---
> **Educational Purpose Only**: This project is strictly for educational and research purposes. It is designed to demonstrate web scraping techniques, API integration, and modern web application architecture. The authors do not encourage or condone the use of this software for any illegal activities, including but not limited to copyright infringement or unauthorized data extraction.

## 🌟 Key Features

- **Advanced Scraping Engine**: Extracts high-quality streaming links from multiple providers (HiAnime, GogoAnime, etc.).
- **Modern UI/UX**: A sleek, responsive interface built with React, Tailwind CSS, and shadcn/ui.
- **Real-time Search**: Fast and efficient search functionality to find any anime instantly.
- **Provider Switching**: Easily switch between different streaming providers for the best viewing experience.
- **Robust Backend**: An Express-based scraper server that handles complex data extraction and proxy management.
- **Database Integration**: MongoDB support for caching and managing anime metadata.

## 🛠️ Technology Stack

### Frontend
- **Framework**: Vite + React + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM
- **Video Player**: HLS.js & Shaka Player for high-performance streaming.

### Backend (Scraper Server)
- **Runtime**: Node.js
- **Framework**: Express
- **Scraping Tools**: Cheerio, Puppeteer, Consumet Extensions
- **Client**: Axios with custom headers and proxy support
- **Database**: MongoDB

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or bun
- MongoDB instance (local or Atlas)

### Installation

1. **Clone the repository**:
   ```sh
   git clone https://github.com/your-username/episodes-on-demand.git
   cd episodes-on-demand
   ```

2. **Install Frontend dependencies**:
   ```sh
   npm install
   ```

3. **Install Backend dependencies**:
   ```sh
   cd server
   npm install
   cd ..
   ```

4. **Environment Configuration**:
   Create a `.env` file in the `server` directory and add your configuration:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   PORT=5000
   ```

5. **Run the application**:
   - Start the backend:
     ```sh
     cd server
     npm run dev
     ```
   - Start the frontend (in a new terminal):
     ```sh
     npm run dev
     ```

## 📜 Disclaimer

This software is provided "as is", without warranty of any kind, express or implied. In no event shall the authors be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.

**The use of this tool for accessing copyrighted content without permission is strictly prohibited.** This project is intended solely to showcase technical skills in full-stack development and web scraping.

## 🛡️ License

MIT License - See the [LICENSE](LICENSE) file for details.
