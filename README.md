<p align="center">
  <img src="public/image/pixel_title.png" width="500" alt="Aniblaze" />
</p>

<p align="center">
  <strong>Episodes On Demand — Ultimate Streaming Experience</strong>
</p>

---

# Demo Video

<video src="https://github.com/user-attachments/assets/6e46f3cf-f587-4852-8e3b-88fe3ffd362e" controls width="600"></video>

---
>[!NOTE]
> <p align="justify"> Educational Purpose Only: This project is strictly for educational and research purposes. It is designed to demonstrate web scraping techniques, API integration, and modern web application architecture. The authors do not encourage or condone the use of this software for any illegal activities. </p>

## Key Features

- **Advanced Scraping Engine**: Extracts high-quality streaming links from multiple providers (HiAnime, GogoAnime, etc.).
- **Modern UI/UX**: A sleek, responsive interface built with React, Tailwind CSS, and shadcn/ui.
- **Real-time Search**: Fast and efficient search functionality to find any anime instantly.
- **Provider Switching**: Easily switch between different streaming providers for the best viewing experience.
- **Robust Backend**: An Express-based scraper server that handles complex data extraction and proxy management.
- **Database Integration**: MongoDB support for caching and managing anime metadata.

## Technology Stack

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

## Getting Started

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

## Screenshots

![Home](https://github.com/Gunjankadam/AniBlaze/blob/main/misc/1.png)

![Home](https://github.com/Gunjankadam/AniBlaze/blob/main/misc/2.png)

![Home](https://github.com/Gunjankadam/AniBlaze/blob/main/misc/3.png)

![Home](https://github.com/Gunjankadam/AniBlaze/blob/main/misc/4.png)


## Disclaimer

**The use of this tool for accessing copyrighted content without permission is strictly prohibited.** This project is intended solely to showcase technical skills in full-stack development and web scraping.

## License

MIT License
