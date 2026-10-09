// Graph presets and data definitions for Smart Emergency Evacuation System
const PRESET_SCENARIOS = {
  report_default: {
    id: "report_default",
    name: "Report Baseline Network",
    description: "Standard road network from student report (5 locations: L0 -> L4, shortest 5 km)",
    source: 0,
    target: 4,
    incident: {
      type: "Structural Fire",
      severity: "CRITICAL",
      locationName: "L0 - Industrial Complex Block A",
      details: "Multi-alarm chemical fire reported. Fast evacuation route to trauma facility needed."
    },
    nodes: [
      { id: 0, label: "L0", name: "Sector A Hazard Zone", type: "source", x: 140, y: 240, icon: "fire" },
      { id: 1, label: "L1", name: "North Commercial Hub", type: "junction", x: 340, y: 120, icon: "building" },
      { id: 2, label: "L2", name: "Central Avenue Overpass", type: "junction", x: 340, y: 360, icon: "road" },
      { id: 3, label: "L3", name: "South River Causeway", type: "junction", x: 560, y: 240, icon: "bridge" },
      { id: 4, label: "L4", name: "National Trauma Hospital", type: "target", x: 740, y: 240, icon: "hospital" }
    ],
    // Undirected road connections: { u, v, weight, blocked }
    edges: [
      { u: 0, v: 1, weight: 4, blocked: false },
      { u: 0, v: 2, weight: 2, blocked: false },
      { u: 1, v: 3, weight: 3, blocked: false },
      { u: 2, v: 3, weight: 2, blocked: false },
      { u: 3, v: 4, weight: 1, blocked: false }
    ]
  },

  road_blocked: {
    id: "road_blocked",
    name: "Avenue Overpass Blocked (Debris)",
    description: "Overpass L2 - L3 is impassable due to earthquake debris. System dynamically reroutes via North Hub L1 (8 km).",
    source: 0,
    target: 4,
    incident: {
      type: "Seismic Shock & Debris",
      severity: "HIGH",
      locationName: "L0 - Industrial Complex Block A",
      details: "Road collapsed between L2 and L3. Algorithmic dynamic detour calculation active."
    },
    nodes: [
      { id: 0, label: "L0", name: "Sector A Hazard Zone", type: "source", x: 140, y: 240, icon: "fire" },
      { id: 1, label: "L1", name: "North Commercial Hub", type: "junction", x: 340, y: 120, icon: "building" },
      { id: 2, label: "L2", name: "Central Avenue Overpass", type: "junction", x: 340, y: 360, icon: "road" },
      { id: 3, label: "L3", name: "South River Causeway", type: "junction", x: 560, y: 240, icon: "bridge" },
      { id: 4, label: "L4", name: "National Trauma Hospital", type: "target", x: 740, y: 240, icon: "hospital" }
    ],
    edges: [
      { u: 0, v: 1, weight: 4, blocked: false },
      { u: 0, v: 2, weight: 2, blocked: false },
      { u: 1, v: 3, weight: 3, blocked: false },
      { u: 2, v: 3, weight: 2, blocked: true }, // Blocked!
      { u: 3, v: 4, weight: 1, blocked: false }
    ]
  },

  campus_extended: {
    id: "campus_extended",
    name: "National Engg College Campus Grid",
    description: "Multi-hub emergency scenario with 7 nodes, student hostel evacuation, and secondary safe shelters.",
    source: 0,
    target: 6,
    incident: {
      type: "Toxic Gas Spill",
      severity: "CRITICAL",
      locationName: "L0 - Science Research Lab Block",
      details: "Hazardous fumes detected in chemistry wing. Route planning to Campus Medical Center."
    },
    nodes: [
      { id: 0, label: "L0", name: "Science Research Lab", type: "source", x: 120, y: 240, icon: "flask" },
      { id: 1, label: "L1", name: "Mech Workshop Quad", type: "junction", x: 280, y: 120, icon: "cog" },
      { id: 2, label: "L2", name: "AI & DS Dept Wing", type: "junction", x: 280, y: 360, icon: "cpu" },
      { id: 3, label: "L3", name: "Central Library Garden", type: "junction", x: 450, y: 240, icon: "book" },
      { id: 4, label: "L4", name: "Hostel Zone Gate 1", type: "junction", x: 600, y: 130, icon: "home" },
      { id: 5, label: "L5", name: "Sports Arena Pavilion", type: "junction", x: 600, y: 350, icon: "shield" },
      { id: 6, label: "L6", name: "Campus Emergency Clinic", type: "target", x: 760, y: 240, icon: "hospital" }
    ],
    edges: [
      { u: 0, v: 1, weight: 3, blocked: false },
      { u: 0, v: 2, weight: 2, blocked: false },
      { u: 1, v: 3, weight: 3, blocked: false },
      { u: 2, v: 3, weight: 4, blocked: false },
      { u: 2, v: 5, weight: 3, blocked: false },
      { u: 1, v: 4, weight: 4, blocked: false },
      { u: 3, v: 4, weight: 2, blocked: false },
      { u: 3, v: 5, weight: 2, blocked: false },
      { u: 4, v: 6, weight: 2, blocked: false },
      { u: 5, v: 6, weight: 3, blocked: false }
    ]
  }
};

window.PRESET_SCENARIOS = PRESET_SCENARIOS;
