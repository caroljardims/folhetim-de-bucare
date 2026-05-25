import { allRolesAtLocation, ALL_BUCARE_LOCATIONS, LOCATION_LABEL_PT, type BucareLocation } from "folclore-game-engine";
import { ROLE_DISPLAY } from "./roleStories.js";

export type LocationGuideEntry = {
  location: BucareLocation;
  label: string;
  description: string;
  inhabitantLabels: string[];
};

const LOCATION_DESCRIPTIONS: Record<BucareLocation, string> = {
  fazenda: "Terras do Coronel, onde o gado dorme e as sombras são longas.",
  lanchonete: "O ponto onde a cidade se encontra de noite — fumaça, vozes e segredos.",
  cais: "Madeira molhada, rio perto e chapéus que aparecem sem dono.",
  rio: "Margens onde a água guarda cantos que não são de ninguém.",
  igreja: "Pedra antiga, velas e passos que não pedem licença.",
  floresta: "Trilhas ao contrário, assovios e pegadas que não fecham.",
  posto_de_saude: "Cheiro de álcool, janelas acesas e sussurros de madrugada.",
  tenda: "Lona roxa, cartas no chão e nomes ditos em voz baixa.",
  terreiro: "Dendê, velas em círculo e terra pisada de muitas direções.",
  casa: "Janelas fechadas, portas rangendo e luzes que não deveriam estar acesas.",
  cemiterio: "Flores frescas, silêncio pesado e figuras que somem ao piscar.",
};

export const DETECTIVE_LOCATION_GUIDE: LocationGuideEntry[] = ALL_BUCARE_LOCATIONS.map(
  (location) => {
    const roles = allRolesAtLocation(location);
    return {
      location,
      label: LOCATION_LABEL_PT[location],
      description: LOCATION_DESCRIPTIONS[location],
      inhabitantLabels: roles.map((r) => ROLE_DISPLAY[r] ?? r),
    };
  },
);
