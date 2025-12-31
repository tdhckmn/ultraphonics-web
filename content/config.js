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

  // Page Content (Titles & Subtitles) & Navigation Configuration
  // Keys determine the order in the navigation menu unless filtered out.
  pages: {
    home: {
      label: "Home",
      link: "index.html",
    },
    weddings: {
      label: "Weddings",
      link: "weddings.html",
      title: "Weddings",
      lead: "Your perfect day deserves the perfect soundtrack.",
      hide: true,
    },
    services: {
      label: "Services",
      link: "services.html",
      title: "Our Services",
      lead: "High-energy live entertainment tailored to your specific event needs."
    },
    quote: {
      label: "Request a Quote",
      link: "quote-request.html",
      title: "Event Inquiry",
      lead: "Tell us about your event to get a fast, accurate quote."
    },
    contact: {
      label: "Contact",
      link: "contact.html",
      title: "Contact Us",
      lead: "Have a general question? Send us a message below."
    },
    // Anchor links treated as 'pages' for navigation purposes
    shows: {
      label: "Events",
      link: "index.html#shows",
    },
    newsletter: {
      label: "Email List",
      link: "index.html#newsletter",
    },
    mediaKit: {
      label: "Media",
      link: "media-kit.html",
      title: "Media Kit",
      lead: "Official photos, promotional assets, and resources.",
    },
  },

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
        image: "assets/images/Weddings.png",
        button: {
          title: "Learn more",
          link: "weddings.html"
        }
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
        image: "assets/images/UltraphonicsLivePromoPic3.png",
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
        image: "assets/images/UltraphonicsLivePromoPic5.jpg",
        attribution: "Photo: Karin Maurer"
      }
    ]
  },

  weddingPage: {
    heading: "A Soundtrack for Every Moment",
    items: [
        {
            title: "The Ceremony",
            description: "Set the perfect tone for your vows. We provide crystal-clear audio support and musical accompaniment for your ceremony.",
            features: [
                "Wireless lavalier microphones for the officiant and couple.",
                "Custom playlist curation for seating and processionals.",
                "Acoustic guitar or piano duo options available."
            ],
            image: "assets/images/Ceremony.png",
        },
        {
            title: "Cocktail Hour",
            description: "Transition smoothly from the ceremony to the party. We keep the energy light and social while your guests mingle.",
            features: [
                "Acoustic duo or jazz trio configurations.",
                "Curated background playlists (Motown, Soft Rock, Jazz).",
                "Separate sound system setup if location differs from reception.",
                "Volume management to ensure comfortable conversation."
            ],
            image: "assets/images/Cocktail.png"
        },
        {
            title: "The Reception",
            description: "This is where the memories are made. We read the room and build the energy until the dance floor is packed.",
            features: [
                "High-energy full band performance (3-4 hours).",
                "Professional stage lighting and dance floor wash.",
                "Learning your specific 'First Dance' and 'Parent Dance' songs.",
                "MC services for introductions, toasts, and cake cutting."
            ],
            image: "assets/images/Reception.png"
        },
        {
            title: "Seamless Production",
            description: "We handle the technical details so you don't have to worry about a thing.",
            features: [
                "Early arrival and setup before guests arrive.",
                "Coordination with your wedding planner and venue staff.",
                "Top-tier professional sound equipment."
            ],
            image: "assets/images/Production.png"
        }
    ]
  },

  // Media Kit / EPK Content
  mediaKit: {
    // Downloads Section
    downloads: [
      { 
        label: "Download Media Kit (Google Drive)", 
        useLink: "mediaKit", 
      },
      { 
        label: "Download Stage Plot (PDF)", 
        useLink: "stagePlot", 
      }
    ],
    // Photo Gallery
    gallery: [
      { src: "assets/images/UltraphonicsLivePromoPic1.jpg", alt: "Ultraphonics Live 1" },
      { src: "assets/images/UltraphonicsLivePromoPic2.jpg", alt: "Ultraphonics Live 2" },
      { src: "assets/images/UltraphonicsLivePromoPic3.png", alt: "Ultraphonics Live 3" },
      { src: "assets/images/UltraphonicsLivePromoPic4.jpg", alt: "Ultraphonics Live 4" },
    ],
    // Audio Demos
    audio: []
  },

  tipping: {
    venmo: "Ultraphonics",
    cashApp: "tomhickman25",
    payPal: "lesterburton17",
    tipAmount: 10,
    note: "🤘",
  },
  
  links: {
    mediaKit: "https://drive.google.com/drive/folders/1FWp2LQpdOpGGXYzdAoZ8KKnkTBOnuebB?usp=sharing",
    stagePlot: "https://drive.google.com/file/d/19QCiGi2nKrpzuGb5ET7U17vBLtI3SJ5R/view?usp=sharing"
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