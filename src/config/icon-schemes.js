import { ICONS } from './icons.js';

// A helper function to create the icon object, pointing to both 16 and 32 sizes
const createIcon = (path) => {
  // Normalize to forward slashes just for parsing; we won't change the original dir
  const normalized = path.replace(/\\/g, "/");

  const lastSlash = normalized.lastIndexOf("/");
  const lastDot = normalized.lastIndexOf(".");

  // If no extension or no slash, bail out clearly
  if (lastSlash === -1 || lastDot === -1 || lastDot <= lastSlash) {
    throw new Error(`Invalid path (missing directory or extension): ${path}`);
  }

  // Extract dir exactly from the ORIGINAL path string (preserves ../, etc.)
  const dir = path.substring(0, lastSlash + 1);

  // Extract base name (without extension), using normalized for robust parsing
  const baseName = normalized.substring(lastSlash + 1, lastDot);

  // Return strings that keep dir unchanged and replace only the file name
  return {
    16: `${dir}${baseName}-16.png`,
    32: `${dir}${baseName}-32.png`,
  };
};

export const iconSchemes = {
  default: {
    myComputer: ICONS.computer,
    recycleBinFull: ICONS.recycleBinFull,
    recycleBinEmpty: ICONS.recycleBinEmpty,
    networkNeighborhood: ICONS.networkNeighborhood,
  },
  "dangerous-creatures": {
    myComputer: {
      16: new URL(
        "../assets/icons/theme-icons/Dangerous Creatures My Computer-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Dangerous Creatures My Computer-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinEmpty: {
      16: new URL(
        "../assets/icons/theme-icons/Dangerous Creatures Recycle Empty-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Dangerous Creatures Recycle Empty-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinFull: {
      16: new URL(
        "../assets/icons/theme-icons/Dangerous Creatures Recycle Full-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Dangerous Creatures Recycle Full-32.png",
        import.meta.url,
      ).href,
    },
    networkNeighborhood: {
      16: new URL(
        "../assets/icons/theme-icons/Dangerous Creatures Network Neighborhood-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Dangerous Creatures Network Neighborhood-32.png",
        import.meta.url,
      ).href,
    },
  },
  "inside-your-computer": {
    myComputer: {
      16: new URL(
        "../assets/icons/theme-icons/Inside your Computer My Computer-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Inside your Computer My Computer-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinEmpty: {
      16: new URL(
        "../assets/icons/theme-icons/Inside your Computer Recycle Empty-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Inside your Computer Recycle Empty-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinFull: {
      16: new URL(
        "../assets/icons/theme-icons/Inside your Computer Recycle Full-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Inside your Computer Recycle Full-32.png",
        import.meta.url,
      ).href,
    },
    networkNeighborhood: {
      16: new URL(
        "../assets/icons/theme-icons/Inside your Computer Network Neighborhood-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Inside your Computer Network Neighborhood-32.png",
        import.meta.url,
      ).href,
    },
  },
  "leonardo-da-vinci": {
    myComputer: {
      16: new URL(
        "../assets/icons/theme-icons/Leonardo da Vinci My Computer-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Leonardo da Vinci My Computer-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinEmpty: {
      16: new URL(
        "../assets/icons/theme-icons/Leonardo da Vinci Recycle Empty-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Leonardo da Vinci Recycle Empty-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinFull: {
      16: new URL(
        "../assets/icons/theme-icons/Leonardo da Vinci Recycle Full-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Leonardo da Vinci Recycle Full-32.png",
        import.meta.url,
      ).href,
    },
    networkNeighborhood: {
      16: new URL(
        "../assets/icons/theme-icons/Leonardo da Vinci Network Neighborhood-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Leonardo da Vinci Network Neighborhood-32.png",
        import.meta.url,
      ).href,
    },
  },
  "more-windows": {
    myComputer: {
      16: new URL(
        "../assets/icons/theme-icons/More Windows My Computer-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/More Windows My Computer-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinEmpty: {
      16: new URL(
        "../assets/icons/theme-icons/More Windows Recycle Empty-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/More Windows Recycle Empty-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinFull: {
      16: new URL(
        "../assets/icons/theme-icons/More Windows Recycle Full-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/More Windows Recycle Full-32.png",
        import.meta.url,
      ).href,
    },
    networkNeighborhood: {
      16: new URL(
        "../assets/icons/theme-icons/More Windows Network Neighborhood-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/More Windows Network Neighborhood-32.png",
        import.meta.url,
      ).href,
    },
  },
  mystery: {
    myComputer: {
      16: new URL(
        "../assets/icons/theme-icons/Mystery My Computer-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Mystery My Computer-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinEmpty: {
      16: new URL(
        "../assets/icons/theme-icons/Mystery Recycle Empty-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Mystery Recycle Empty-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinFull: {
      16: new URL(
        "../assets/icons/theme-icons/Mystery Recycle Full-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Mystery Recycle Full-32.png",
        import.meta.url,
      ).href,
    },
    networkNeighborhood: {
      16: new URL(
        "../assets/icons/theme-icons/Mystery Network Neighborhood-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Mystery Network Neighborhood-32.png",
        import.meta.url,
      ).href,
    },
  },
  nature: {
    myComputer: {
      16: new URL(
        "../assets/icons/theme-icons/Nature My Computer-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Nature My Computer-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinEmpty: {
      16: new URL(
        "../assets/icons/theme-icons/Nature Recycle Empty-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Nature Recycle Empty-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinFull: {
      16: new URL(
        "../assets/icons/theme-icons/Nature Recycle Full-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Nature Recycle Full-32.png",
        import.meta.url,
      ).href,
    },
    networkNeighborhood: {
      16: new URL(
        "../assets/icons/theme-icons/Nature Network Neighborhood-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Nature Network Neighborhood-32.png",
        import.meta.url,
      ).href,
    },
  },
  science: {
    myComputer: {
      16: new URL(
        "../assets/icons/theme-icons/Science My Computer-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Science My Computer-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinEmpty: {
      16: new URL(
        "../assets/icons/theme-icons/Science Recycle Empty-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Science Recycle Empty-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinFull: {
      16: new URL(
        "../assets/icons/theme-icons/Science Recycle Full-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Science Recycle Full-32.png",
        import.meta.url,
      ).href,
    },
    networkNeighborhood: {
      16: new URL(
        "../assets/icons/theme-icons/Science Network Neighborhood-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Science Network Neighborhood-32.png",
        import.meta.url,
      ).href,
    },
  },
  sports: {
    myComputer: {
      16: new URL(
        "../assets/icons/theme-icons/Sports My Computer-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Sports My Computer-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinEmpty: {
      16: new URL(
        "../assets/icons/theme-icons/Sports Recycle Empty-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Sports Recycle Empty-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinFull: {
      16: new URL(
        "../assets/icons/theme-icons/Sports Recycle Full-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Sports Recycle Full-32.png",
        import.meta.url,
      ).href,
    },
    networkNeighborhood: {
      16: new URL(
        "../assets/icons/theme-icons/Sports Network Neighborhood-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Sports Network Neighborhood-32.png",
        import.meta.url,
      ).href,
    },
  },
  "60s-usa": {
    myComputer: {
      16: new URL(
        "../assets/icons/theme-icons/The 60's USA My Computer-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/The 60's USA My Computer-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinEmpty: {
      16: new URL(
        "../assets/icons/theme-icons/The 60's USA Recycle Empty-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/The 60's USA Recycle Empty-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinFull: {
      16: new URL(
        "../assets/icons/theme-icons/The 60's USA Recycle Full-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/The 60's USA Recycle Full-32.png",
        import.meta.url,
      ).href,
    },
    networkNeighborhood: {
      16: new URL(
        "../assets/icons/theme-icons/The 60's USA Network Neighborhood-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/The 60's USA Network Neighborhood-32.png",
        import.meta.url,
      ).href,
    },
  },
  "the-golden-era": {
    myComputer: {
      16: new URL(
        "../assets/icons/theme-icons/The Golden Era My Computer-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/The Golden Era My Computer-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinEmpty: {
      16: new URL(
        "../assets/icons/theme-icons/The Golden Era Recycle Empty-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/The Golden Era Recycle Empty-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinFull: {
      16: new URL(
        "../assets/icons/theme-icons/The Golden Era Recycle Full-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/The Golden Era Recycle Full-32.png",
        import.meta.url,
      ).href,
    },
    networkNeighborhood: {
      16: new URL(
        "../assets/icons/theme-icons/The Golden Era Network Neighborhood-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/The Golden Era Network Neighborhood-32.png",
        import.meta.url,
      ).href,
    },
  },
  travel: {
    myComputer: {
      16: new URL(
        "../assets/icons/theme-icons/Travel My Computer-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Travel My Computer-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinEmpty: {
      16: new URL(
        "../assets/icons/theme-icons/Travel Recycle Empty-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Travel Recycle Empty-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinFull: {
      16: new URL(
        "../assets/icons/theme-icons/Travel Recycle Full-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Travel Recycle Full-32.png",
        import.meta.url,
      ).href,
    },
    networkNeighborhood: {
      16: new URL(
        "../assets/icons/theme-icons/Travel Network Neighborhood-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Travel Network Neighborhood-32.png",
        import.meta.url,
      ).href,
    },
  },
  "windows-98": {
    myComputer: {
      16: new URL(
        "../assets/icons/theme-icons/Windows 98 My Computer-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Windows 98 My Computer-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinEmpty: {
      16: new URL(
        "../assets/icons/theme-icons/Windows 98 Recycle Empty-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Windows 98 Recycle Empty-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinFull: {
      16: new URL(
        "../assets/icons/theme-icons/Windows 98 Recycle Full-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Windows 98 Recycle Full-32.png",
        import.meta.url,
      ).href,
    },
    networkNeighborhood: {
      16: new URL(
        "../assets/icons/theme-icons/Windows 98 Network Neighborhood-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Windows 98 Network Neighborhood-32.png",
        import.meta.url,
      ).href,
    },
  },
  baseball: {
    myComputer: {
      16: new URL(
        "../assets/icons/theme-icons/Baseball My Computer-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Baseball My Computer-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinEmpty: {
      16: new URL(
        "../assets/icons/theme-icons/Baseball Recycle Empty-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Baseball Recycle Empty-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinFull: {
      16: new URL(
        "../assets/icons/theme-icons/Baseball Recycle Full-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Baseball Recycle Full-32.png",
        import.meta.url,
      ).href,
    },
    networkNeighborhood: {
      16: new URL(
        "../assets/icons/theme-icons/Baseball Network Neighborhood-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Baseball Network Neighborhood-32.png",
        import.meta.url,
      ).href,
    },
  },
  jungle: {
    myComputer: {
      16: new URL(
        "../assets/icons/theme-icons/Jungle My Computer-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Jungle My Computer-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinEmpty: {
      16: new URL(
        "../assets/icons/theme-icons/Jungle Recycle Empty-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Jungle Recycle Empty-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinFull: {
      16: new URL(
        "../assets/icons/theme-icons/Jungle Recycle Full-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Jungle Recycle Full-32.png",
        import.meta.url,
      ).href,
    },
    networkNeighborhood: {
      16: new URL(
        "../assets/icons/theme-icons/Jungle Network Neighborhood-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Jungle Network Neighborhood-32.png",
        import.meta.url,
      ).href,
    },
  },
  space: {
    myComputer: {
      16: new URL(
        "../assets/icons/theme-icons/Space My Computer-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Space My Computer-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinEmpty: {
      16: new URL(
        "../assets/icons/theme-icons/Space Recycle Empty-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Space Recycle Empty-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinFull: {
      16: new URL(
        "../assets/icons/theme-icons/Space Recycle Full-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Space Recycle Full-32.png",
        import.meta.url,
      ).href,
    },
    networkNeighborhood: {
      16: new URL(
        "../assets/icons/theme-icons/Space Network Neighborhood-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Space Network Neighborhood-32.png",
        import.meta.url,
      ).href,
    },
  },
  underwater: {
    myComputer: {
      16: new URL(
        "../assets/icons/theme-icons/Underwater My Computer-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Underwater My Computer-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinEmpty: {
      16: new URL(
        "../assets/icons/theme-icons/Underwater Recycle Empty-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Underwater Recycle Empty-32.png",
        import.meta.url,
      ).href,
    },
    recycleBinFull: {
      16: new URL(
        "../assets/icons/theme-icons/Underwater Recycle Full-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Underwater Recycle Full-32.png",
        import.meta.url,
      ).href,
    },
    networkNeighborhood: {
      16: new URL(
        "../assets/icons/theme-icons/Underwater Network Neighborhood-16.png",
        import.meta.url,
      ).href,
      32: new URL(
        "../assets/icons/theme-icons/Underwater Network Neighborhood-32.png",
        import.meta.url,
      ).href,
    },
  },
};
