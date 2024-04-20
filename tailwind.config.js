module.exports = {
  content: [
    "./path/to/your/html/files/**/*.html",
    "./path/to/your/js/files/**/*.js",
    // Add other paths here if you use other file types (e.g., .vue, .jsx)
  ],
  theme: {
    extend: {
      colors: {
        "brand-blue": "#0055E5",
        // Add other colors here
      },
      fontFamily: {
        sans: ["Open Sans", "sans-serif"],
        heading: ["Montserrat Alternates", "sans-serif"],
        // Add other font families here
      },
      // Add more customizations here
    },
  },
  // Enable additional features or plugins here
};
