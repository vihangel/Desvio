export type Artist = { id:string;name:string;location:string;bio:string;source:string };
export type Artwork = { id:string;title:string;author:string;year:number|null;room:number;type:"image"|"model";image?:string;description:string;source?:string;kind?:string;rights?:"reference"|"demo"|"licensed" };
export const artists:Artist[] = [
{id:"linscker",name:"Linscker Marim",location:"Rondonópolis, MT",bio:"Artista visual, pesquisadora e professora com trabalhos em moda, arte têxtil, performance e audiovisual. Idealizou Entre Fios & Tramas, financiada em 2024 pela FARM e pelo Instituto Precisa Ser.",source:"https://panorama.labfront.com.br/os-artistas/"},
{id:"sol",name:"O Sol Ferreira",location:"Cuiabá e Várzea Grande, MT",bio:"Multiartista transmasculino de Mato Grosso. Sua produção cruza artes visuais, literatura, performance, memória e território.",source:"https://www.hnt.com.br/cuiabanalia/exposicao-homem-fruta-homem-mato-destaca-trajetoria-de-o-sol-ferreira-na-ufmt/510752"}
];
export const rooms = [
{name:"Fios e dissidências",subtitle:"Linscker · corpo, moda e audiovisual"},
{name:"Corpo e território",subtitle:"O Sol · memória, natureza e identidade"},
{name:"Arquivos em movimento",subtitle:"Videoartes, pesquisa e documentação"}
];
export const artworks:Artwork[] = [
{id:"fios",title:"Entre Fios & Tramas: TRANSgressões de Gênero",author:"Linscker Marim",year:2024,room:0,type:"image",image:"/art/desvio-fios.svg",description:"Exposição individual realizada em 2024, com financiamento da FARM e do Instituto Precisa Ser. Pesquisa moda, memória e dissidência de gênero.",source:"https://panorama.labfront.com.br/os-artistas/",kind:"Exposição",rights:"reference"},
{id:"emaranhados",title:"Emaranhados Psíquicos",author:"Linscker Marim",year:2024,room:0,type:"image",image:"/art/desvio-emaranhados.svg",description:"Videoarte de 2024 listada no catálogo Panorama 7, cujo texto aborda as relações entre ego, id e superego.",source:"https://panorama.labfront.com.br/obras-2026/",kind:"Videoarte",rights:"reference"},
{id:"manga",title:"Manga Coração de Boi",author:"O Sol Ferreira",year:2021,room:1,type:"image",image:"/art/desvio-manga.svg",description:"Exposição realizada em Cuiabá, na Casa das Pretas, associando referências regionais e experiências trans.",source:"https://cenariomt.com.br/cenario-politico/gov-mt/exposicao-manga-coracao-de-boi-transversaliza-aspectos-mato-grossenses-e-a-existencia-de-pessoas-trans/",kind:"Exposição",rights:"reference"},
{id:"homem",title:"Homem-fruta, Homem-mato",author:"O Sol Ferreira",year:2025,room:1,type:"image",image:"/art/desvio-homem.svg",description:"Exposição autobiográfica apresentada no MUSEAR/UFMT em 2025, relacionando trajetória, território e identidade.",source:"https://www.hnt.com.br/cuiabanalia/exposicao-homem-fruta-homem-mato-destaca-trajetoria-de-o-sol-ferreira-na-ufmt/510752",kind:"Exposição",rights:"reference"},
{id:"transformacao",title:"Trans•forma•ação",author:"Linscker Marim e coletivo",year:null,room:2,type:"image",image:"/art/desvio-transformacao.svg",description:"Videoarte coletiva com mais três artistas de Rondonópolis, selecionada para o 26º Salão Jovem Arte de Cuiabá. Ano de criação a confirmar.",source:"https://panorama.labfront.com.br/os-artistas/",kind:"Videoarte coletiva",rights:"reference"},
{id:"cara",title:"De Cara com Sol",author:"O Sol Ferreira",year:2025,room:2,type:"image",image:"/art/desvio-cara.svg",description:"Websérie documental em cinco episódios idealizada e apresentada por O Sol Ferreira, lançada em fevereiro de 2025.",source:"https://leiagora.com.br/gravada-na-galeria-do-padua-webserie-sobre-universo-trans-e-exibida-em-cuiaba/",kind:"Websérie",rights:"reference"},
{id:"estudo",title:"Estudo tridimensional do Desvio",author:"Equipe Desvio",year:2026,room:2,type:"model",description:"Escultura procedural apenas para teste técnico. Não representa obra das pessoas artistas documentadas.",kind:"Demonstração técnica",rights:"demo"}
];
export const exhibition={title:"Corpos, fios e territórios",subtitle:"Acervo Trans de Mato Grosso",status:"research",notice:"Prévia curatorial independente. Painéis editoriais sem reproduzir obras originais."};
