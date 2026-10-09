# Smart Emergency Evacuation & Rescue Route System
### 23AD35C – Data Structures Micro Project
**Department of Artificial Intelligence and Data Science**  
**National Engineering College, K.R.Nagar, Kovilpatti**  
*(An Autonomous Institution Affiliated to Anna University, Chennai)*  

**Presented by:** Abinaya M (Roll No: 25253047) — B.Tech AI & DS, 2nd Year / 3rd Sem (Odd)

---

## 🌟 Overview & UI/UX Transformation

The original project implements a C-based application that models road infrastructure as an adjacency matrix graph and calculates the guaranteed shortest evacuation route using **Dijkstra's Algorithm**.

While the C backend and algorithm are mathematically sound, the original prototype UI (shown in the project report page 8) was a plain generic white dashboard with minimal interactivity and no visual map. 

This **Mission Control HUD** redesign transforms the project into a state-of-the-art emergency dispatch operations center:
- **Cyber-Tactical Glassmorphism Theme**: Deep obsidian slate (`#070a12`), glowing cyan and emerald vectors, pulsing danger zones, and crisp typography (`Space Grotesk`, `Plus Jakarta Sans`, `JetBrains Mono`).
- **Real-Time Interactive Graph Canvas**:
  - Interactive nodes (Drag and reposition freely).
  - High-intensity glowing evacuation corridors.
  - **Dynamic Road Obstacle Simulation**: Click any roadway to trigger roadblocks (fallen trees, floods, debris) — the system dynamically recalculates the new safest shortest path in real-time!
  - **Animated Rescue Vehicles**: Dispatch Ambulances, Fire Rescue trucks, or Evac Drones with active siren blinkers animating along the route.
- **Algorithm Step-by-Step Playback**:
  - Controls: Play, Pause, Step Next, Step Back, Reset, Speed Slider.
  - C Runtime Memory Inspector (`distance[]`, `visited[]`, `parent[]` arrays updating in real-time).
- **Interactive Adjacency Matrix**:
  - Direct grid viewer matching `graph[MAX][MAX]`.
  - Hover highlights corresponding edges on the map canvas.
- **Tactical Audio FX**:
  - Procedural sound effects using Web Audio API (tactical clicks, route solved chime, alert siren).

---

## 🚀 How to Run Locally

### Option 1: Direct Browser Access
Simply double-click or open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Brave, Firefox).

### Option 2: Local Python Server
Run the built-in HTTP server:
```bash
python -m http.server 3000
```
Then navigate to: `http://localhost:3000`

---

## 📂 Project Structure
```text
smart-emergency-system/
├── index.html                 # Main Mission Control HUD Web App
├── css/
│   └── style.css              # Custom styling, glassmorphism, responsive grid, animations
├── js/
│   ├── app.js                 # Dijkstra engine, canvas rendering, step debugger, vehicle animation
│   ├── graph-data.js          # Road network presets (Default, Blocked Road, Campus Grid)
│   └── sound.js               # Web Audio API tactical sound synthesis
├── smart_emergency_system.c   # Original C source code from the project report
└── README.md                  # Project documentation & guide
```
