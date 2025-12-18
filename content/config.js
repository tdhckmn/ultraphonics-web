export const config = {
  // Global Contact Info
  siteInfo: {
    copyrightName: "Ultraphonics"
  },

  // API Keys and IDs
  ids: {
    googleAnalytics: "G-7RFPHXHGBC",
    emailjs: {
      publicKey: "KhA8Z-PRCg69qMpWp",
      serviceId: "service_eujinnf",
      contactTemplateId: "template_o1lwsxk",
      quoteTemplateId: "template_0i5n9gk"
    }
  },

  // Page Content (Titles & Subtitles)
  pages: {
    contact: {
      title: "Contact Us",
      lead: "Have a general question? Send us a message below."
    },
    quote: {
      title: "Event Inquiry",
      lead: "Tell us about your event to get a fast, accurate quote."
    },
    services: {
      title: "Our Services",
      lead: "High-energy live entertainment tailored to your specific event needs."
    }
  },

  // Navigation Menu Items
  navigation: [
    { label: "Home", link: "index.html" },
    { label: "Services", link: "services.html" },
    { label: "Request a Quote", link: "quote-request.html" },
    { label: "Contact", link: "contact.html" },
    { label: "Events", link: "index.html#shows" },
    { label: "Email List", link: "index.html#newsletter" }
  ],

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
    // Detailed Configuration for the Services Page
    detailedItems: [
      {
        title: "Weddings & Private Events",
        description: "Make your special day unforgettable with a playlist that spans generations. We provide the perfect soundtrack for every moment, from the first dance to the final encore.",
        features: [
            "Customized setlists including your special requests.",
            "MC services to handle announcements and flow.",
            "Full sound and lighting tailored to the venue size.",
            "Options for cocktail hour and ceremony music."
        ],
        image: "assets/images/Weddings.jpg",
        attribution: "Photo: Karin Maurer"
      },
      {
        title: "Corporate Parties & Holiday Events",
        description: "Professional, high-energy entertainment for your company gatherings. We understand the balance between providing a background atmosphere and creating dance-floor energy when the time is right.",
        features: [
            "Scalable band sizes to fit your budget and space.",
            "Professional attire and demeanor.",
            "Wireless microphone availability for speeches and awards.",
            "Flexible scheduling to match your itinerary."
        ],
        image: "assets/images/Corporate.png",
        attribution: "Photo: Justin Collins-Domansky"
      },
      {
        title: "Bar & Brewery Sets",
        description: "Keep the drinks flowing and the patrons dancing. We bring a 'night out' vibe that keeps customers engaged and staying longer.",
        features: [
            "3-4 hour marathon sets with minimal breaks.",
            "Crowd-interactive sing-alongs (Rock, Pop, Country, Soul).",
            "Social media promotion to our local following.",
            "Volume control appropriate for the venue."
        ],
        image: "assets/images/Bars.png",
        attribution: "Photo: Emily Yates"
      },
      {
        title: "Music Halls & Festivals",
        description: "Big stage energy for larger crowds. We have the experience to handle professional stage plots, quick changeovers, and high-fidelity sound requirements.",
        features: [
            "Tight, rehearsed show tailored to specific time slots.",
            "Professional gear compatible with festival backlines.",
            "Original music options available upon request.",
            "Promo materials available for marketing."
        ],
        image: "assets/images/Festivals.png",
        attribution: "Photo: Lester Burton"
      }
    ]
  },

  tipping: {
    venmo: "Ultraphonics",
    cashApp: "tomhickman25",
    payPal: "lesterburton17",
    tipAmount: 10,
    note: "🤘",
  },
  
  links: {
    mediaKit: "https://drive.google.com/drive/folders/1FWp2LQpdOpGGXYzdAoZ8KKnkTBOnuebB?usp=sharing"
  },

  // Selectors for DOM elements
  selectors: {
    // Hero
    bandName: "#band-name",
    tagline: "#tagline",
    genres: "#genres",
    // Shows
    showsContainer: "#shows",
    // Buttons & Header
    contactButton: "#contact-button",
    tipButton: "#tip-button",
    requestButton: "#request-button",
    header: "header",
  },
};