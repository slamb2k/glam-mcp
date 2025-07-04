/**
 * ASCII Art Banner for Slambed MCP
 * Displays branding and tagline across CLI and documentation
 */

import chalk from 'chalk';

/**
 * ASCII art banner with fist and slambed branding
 */
export const BANNER_ART = `
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                       ║
║                                                                                                       ║
║⠀⠀  ⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⡆⢀⣤⣤⣤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀                                                                       ║ 
║⠀⠀⠀  ⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢀⣀⣤⣀⠀⠀⠀⠀⠀                                                                         ║     
║⠀  ⠀⠀⠀⠀⠀⠀⢀⣿⣿⣿⣿⠿⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣀⡀⠀⠀                                                                         ║ 
║⠀⠀  ⠀⠀⠀⠀⠀⣼⣿⣿⣿⡟⢀⣿⣿⣿⣿⡟⢻⣿⣿⣿⣿⣿⣿⣿⣷⡄⠀            ▀██                     ▀██                  ▀██  ▄█▄       ║ 
║⠀⠀  ⠀⠀⢠⠆⢰⣿⣿⣿⣿⠁⣼⣿⣿⣿⡿⠀⣼⣿⣿⣿⠿⢿⣿⣿⣿⠇⠀      ▄▄▄▄   ██   ▄▄▄▄   ▄▄ ▄▄ ▄▄    ██ ▄▄▄    ▄▄▄▄    ▄▄ ██  ███       ║
║⠀  ⠀⠀⠀⣿⠀⣾⣿⣿⣿⡟⢰⣿⣿⣿⣿⠃⣸⣿⣿⣿⠏⢠⣿⣿⣿⡿⠀⠀      ██▄ ▀  ██  ▀▀ ▄██   ██ ██ ██   ██▀  ██ ▄█▄▄▄██ ▄▀  ▀██  ▀█▀       ║
║⠀  ⠀⠀⢸⡇⢠⣿⣿⣿⡿⠀⣾⣿⣿⣿⠇⢠⣿⣿⣿⡏⢠⣿⣿⣿⣿⠁⠀      ▄ ▀█▄▄  ██  ▄█▀ ██   ██ ██ ██   ██    █ ██      █▄   ██   █        ║
║⠀  ⠀⠀⣾⣧⡈⠛⢿⣿⠃⣸⣿⣿⣿⡏⢠⣿⣿⣿⡟⢀⣾⣿⣿⣿⠃⠀⠀⠀     █▀▄▄█▀ ▄██▄ ▀█▄▄▀█▀ ▄██ ██ ██▄  ▀█▄▄▄▀   ▀█▄▄▄▀ ▀█▄▄▀██▄  ▄        ║
║⠀  ⠀⠀⠿⣿⣿⣶⣄⡉⠀⢿⣿⣿⡟⠀⣾⣿⣿⡿⢀⣾⣿⣿⡿⠁⠀⠀⠀⠀                                                              ▀█▀       ║
║⠀⠀  ⠀⠀⠈⠉⠛⠛⠛⠒⠀⠈⠉⠁⠸⠿⠿⠿⠃⠾⠿⠟⠋⠀⠀⠀⠀⠀                                                                         ║        
║                                                                                                       ║      
║                                                                                                       ║
║                                   🚀 Git Flow Automation & MCP Server 🚀                              ║
║                                                                                                       ║
║                                     Git workflows that pack a punch! ✊                               ║ 
║                                                                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
`;

/**
 * Compact banner for smaller spaces
 */
export const COMPACT_BANNER = `
  ✊ SLAMBED! - Git Flow Automation & MCP Server
     Git workflows that pack a punch!
`;

/**
 * Minimal banner for inline use
 */
export const MINIMAL_BANNER = `✊ SLAMBED!`;

/**
 * Get colored banner with chalk styling
 */
export function getColoredBanner(compact = false) {
  if (compact) {
    return chalk.cyan.bold(COMPACT_BANNER);
  }
  
  return chalk.cyan.bold(BANNER_ART);
}

/**
 * Get banner with custom colors
 */
export function getStyledBanner(options = {}) {
  const {
    fistColor = 'yellow',
    titleColor = 'cyan',
    taglineColor = 'green',
    compact = false
  } = options;

  if (compact) {
    return chalk[fistColor]('✊') + ' ' + 
           chalk[titleColor].bold('SLAMBED!') + ' - ' +
           chalk[taglineColor]('Git Flow Automation & MCP Server') + '\n' +
           '     ' + chalk[taglineColor]('Git workflows that pack a punch!');
  }

  // For full banner, apply colors to different sections
  const lines = BANNER_ART.split('\n');
  const coloredLines = lines.map((line, index) => {
    if (line.includes('███████ ██       █████') || line.includes('slambed')) {
      return chalk[titleColor].bold(line);
    } else if (line.includes('Git Flow Automation') || line.includes('pack a punch')) {
      return chalk[taglineColor](line);
    } else if (line.includes('████') && index < 15) {
      return chalk[fistColor](line);
    }
    return chalk.cyan(line);
  });

  return coloredLines.join('\n');
}

/**
 * Display banner to console
 */
export function showBanner(options = {}) {
  console.log(getStyledBanner(options));
}

/**
 * Get plain text banner (no colors) for documentation
 */
export function getPlainBanner(compact = false) {
  return compact ? COMPACT_BANNER : BANNER_ART;
}