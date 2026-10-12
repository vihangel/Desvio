import alemDasAmarras from "../../assets/linscker/alem-das-amarras.png";
import aNecaDaBoneca from "../../assets/linscker/a-neca-da-boneca.png";
import retificada from "../../assets/linscker/retificada.png";
import type { CollectionSnapshot } from "../../domain/entities";
import { roomSlots } from "../../domain/slots";
import { seedId } from "./seed";
const samples = [
  {
    number: 3,
    title: "Além das Amarras",
    year: 2024,
    image: alemDasAmarras,
    description:
      "A obra tensiona normas de gênero na moda ao transformar o espartilho em uma composição que rompe com a ideia de um corpo ideal. Síntese editorial a partir do texto da artista no catálogo da exposição.",
    alt: "Imagem rosa de um corpo vestido com peça têxtil e máscara, atravessado por fios vermelhos; título Além das Amarras na lateral.",
    technicalDetails: {
      technique: "Mista",
      dimensions: "59 × 111 cm",
      materials:
        "Tecido, linha de costura, fibra siliconada, linha de bordado e apliques.",
    },
  },
  {
    number: 1,
    title: "A Neca da Boneca",
    year: 2023,
    image: aNecaDaBoneca,
    description:
      "A artista parte de lembranças de infância para construir uma boneca travesti e refletir sobre representação, identidade e pertencimento. Síntese editorial a partir do texto da artista no catálogo da exposição.",
    alt: "Imagem rosa de uma boneca têxtil com máscara, deitada sobre fundo claro; título A Neca da Boneca na lateral.",
    technicalDetails: {
      technique: "Mista",
      dimensions: "175 × 182 cm",
      materials:
        "Tecido, linha de costura, linha de bordado, fios de macramê e aplicações em pérolas.",
    },
  },
  {
    number: 2,
    title: "Retificada",
    year: 2023,
    image: retificada,
    description:
      "A peça aborda o reconhecimento da identidade trans por meio da retificação de documentos e questiona o papel da validação social. Síntese editorial a partir do texto da artista no catálogo da exposição.",
    alt: "Imagem rosa de uma certidão de nascimento bordada e cercada por apliques, com o título Retificada na lateral.",
    technicalDetails: {
      technique: "Mista",
      dimensions: "33 × 24 cm",
      materials:
        "Tecido, folha de acetato, linha de bordado, caneta esferográfica com tinta à base d’água, linha de costura e apliques.",
    },
  },
];
// Non-persistent overlay. Public seed, drafts and editorial approval are untouched.
export function createLinsckerPreview(
  base: CollectionSnapshot,
): CollectionSnapshot {
  const snapshot = structuredClone(base);
  const artist = snapshot.artists.find((a) => a.id === seedId(1));
  const room = snapshot.rooms.find((r) => r.id === seedId(10));
  if (!artist || !room)
    throw new Error("A sala e o cadastro de Linscker não estão disponíveis.");
  const available = roomSlots(room).filter(
    (s) =>
      s.type === "image" &&
      !snapshot.placements.some(
        (p) => p.roomId === room.id && p.slotId === s.id,
      ),
  );
  if (available.length < samples.length)
    throw new Error(
      "A sala de Linscker precisa de três slots livres para esta prévia.",
    );
  samples.forEach((sample, index) => {
    const id = seedId(1000 + sample.number),
      mediaId = seedId(1100 + sample.number),
      slot = available[index];
    snapshot.records.push({
      id,
      title: sample.title,
      year: sample.year,
      description: sample.description,
      kind: "Obra têxtil",
      credits: [{ artistId: artist.id, role: "artista" }],
      creditNote: "",
      status: "draft",
      source: `https://www.transgressoesdegenero.com/obras/${sample.number}/`,
      technicalDetails: sample.technicalDetails,
    });
    snapshot.media.push({
      id: mediaId,
      recordId: id,
      type: "image",
      src: sample.image,
      alt: sample.alt,
      rights: "preview",
      attribution:
        "Obra: Linscker Marim. Imagem: catálogo Entre Fios & Tramas — TRANSgressões de Gênero. Crédito fotográfico não informado na página de origem.",
    });
    snapshot.placements.push({
      id: seedId(1200 + sample.number),
      recordId: id,
      mediaId,
      roomId: room.id,
      slotId: slot.id,
      position: slot.position,
      rotation: slot.rotation,
      scale: [1, 1, 1],
    });
  });
  return snapshot;
}
