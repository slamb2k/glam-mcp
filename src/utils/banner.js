/**
 * ASCII Art Banner for glam-mcp
 */

export function getBanner() {
  return `
   ██████╗ ██╗      █████╗ ███╗   ███╗      ███╗   ███╗ ██████╗██████╗ 
  ██╔════╝ ██║     ██╔══██╗████╗ ████║      ████╗ ████║██╔════╝██╔══██╗
  ██║  ███╗██║     ███████║██╔████╔██║█████╗██╔████╔██║██║     ██████╔╝
  ██║   ██║██║     ██╔══██║██║╚██╔╝██║╚════╝██║╚██╔╝██║██║     ██╔═══╝ 
  ╚██████╔╝███████╗██║  ██║██║ ╚═╝ ██║      ██║ ╚═╝ ██║╚██████╗██║     
   ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝      ╚═╝     ╚═╝ ╚═════╝╚═╝     
`;
}

export function getCompactBanner() {
  return `
  ╔═══════════════════════════════════════╗
  ║            glam-mcp v2.0              ║
  ║    Git-Like Automation Manager        ║
  ╚═══════════════════════════════════════╝
`;
}

export function getMinimalBanner() {
  return `glam-mcp | Git-Like Automation Manager`;
}

export function showBanner(style = 'full') {
  const banners = {
    full: getBanner(),
    compact: getCompactBanner(),
    minimal: getMinimalBanner()
  };
  
  const banner = banners[style] || banners.full;
  console.log('\x1b[36m%s\x1b[0m', banner); // Cyan color
}

export function getWelcomeMessage() {
  return `
Welcome to glam-mcp - Your intelligent development companion!

🚀 Features:
  • Smart Git workflow automation
  • Contextual AI assistance
  • Team collaboration tools
  • Safety checks and risk analysis

Get started with: glam --help
`;
}