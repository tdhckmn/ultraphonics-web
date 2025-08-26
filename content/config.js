// content/config.js
export const config = {
  // Hero Section Content
  hero: {
    bandName: "Ultraphonics",
    tagline: "High-Energy Live Band for Events, Weddings & Bars",
    genres: "Rock • Pop • Country • Soul",
  },

  // Services Section Content
  services: {
    heading: "Book Us for Your Next Event",
    leadText:
      "Ultraphonics delivers high-energy live music to weddings, private parties, corporate events, bars, and music venues in Detroit, Ann Arbor, and Toledo.",
    gridItems: [
      "Weddings & Private Events",
      "Corporate Parties & Holiday Events",
      "Bar & Brewery Sets",
      "Music Halls & Festivals",
    ],
    equipmentNote: "Full sound and lighting available — indoor or outdoor.",
  },

  // Venmo Configuration
  venmo: {
    username: "Ultraphonics",
    tipAmount: 10,
    note: "🤘",
  },

  // Selectors for DOM elements
  selectors: {
    // Hero
    bandName: "#band-name",
    tagline: "#tagline",
    genres: "#genres",
    // Services
    servicesHeading: "#services-heading",
    servicesLeadText: "#services-lead-text",
    servicesGrid: "#services-grid",
    equipmentNote: "#equipment-note",
    // Shows
    showsContainer: "#shows",
    // Buttons & Header
    contactButton: "#contact-button",
    venmoButton: "#venmo-button",
    header: "header",
  },
};