// src/utils/formats.ts

// Catálogo oficial de formatos agrupado por generaciones (Idéntico a Showdown)
export const SHOWDOWN_FORMATS = [
  {
    group: "Generación 9 (Escarlata / Púrpura)",
    options: [
      { id: "gen9vgc2024regf", name: "VGC 2024 Reg F" },
      { id: "gen9vgc2024regg", name: "VGC 2024 Reg G" },
      { id: "gen9ou", name: "OU (Singles)" },
      { id: "gen9doublesou", name: "Doubles OU" },
      { id: "gen9nationaldex", name: "National Dex" },
      { id: "gen9randombattle", name: "Random Battle" }
    ]
  },
  {
    group: "Generación 8 (Espada / Escudo)",
    options: [
      { id: "gen8vgc2022", name: "VGC 2022" },
      { id: "gen8ou", name: "OU (Singles)" },
      { id: "gen8doublesou", name: "Doubles OU" }
    ]
  },
  {
    group: "Formatos Clásicos (Retro)",
    options: [
      { id: "gen7ou", name: "[Gen 7] Sol/Luna OU" },
      { id: "gen6ou", name: "[Gen 6] XY OU" },
      { id: "gen5ou", name: "[Gen 5] B/W OU" },
      { id: "gen4ou", name: "[Gen 4] D/P/Pt OU" },
      { id: "gen3ou", name: "[Gen 3] R/S/E OU" },
      { id: "gen2ou", name: "[Gen 2] O/P/C OU" },
      { id: "gen1ou", name: "[Gen 1] R/A/A OU" },
    ]
  }
];

// Función extractora: Lee el ID del formato (ej. "gen4ou") y nos devuelve el número 4.
// Esto será la magia que adaptará nuestro Editor más adelante.
export const getGenFromFormat = (formatId: string): number => {
  const match = formatId.match(/gen(\d+)/i);
  return match ? parseInt(match[1]) : 9; // Por defecto asume Gen 9 si es algo Custom
};

// Función para obtener el nombre bonito a partir del ID para mostrarlo en las tarjetas
export const getFormatName = (formatId: string): string => {
  if (formatId === 'Custom') return 'Custom / Sin Reglas';
  for (const group of SHOWDOWN_FORMATS) {
    const option = group.options.find(opt => opt.id === formatId);
    if (option) return option.name;
  }
  return formatId;
};