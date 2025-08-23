// Weather client help
export function printWeatherHelp() {
  console.log("\n🌤️ Weather Client Commands:");
  console.log("-------------------------");
  console.log("🌡️  weather <city>     - Get current weather");
  console.log("📅 forecast <city>    - Get 5-day forecast");
  console.log("📋 logs              - View server logs");
  console.log("❓ help              - Show this help message");
  console.log("👋 quit              - Exit the program\n");
}

// File system client help
export function printFileHelp() {
  console.log("\n📁 File System Client Commands:");
  console.log("--------------------------------");
  console.log("📖 read <filepath>     - Read contents of a file");
  console.log("📂 list <dirpath>      - List contents of a directory");
  console.log("🔍 search <dir> <glob> - Search files by glob pattern");
  console.log("📋 logs               - View server logs");
  console.log("❓ help               - Show this help message");
  console.log("👋 quit               - Exit the program\n");
}
