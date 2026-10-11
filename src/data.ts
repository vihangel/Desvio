export type Artwork={id:string;title:string;author:string;year:number;room:number;type:"image"|"model";image?:string;description:string};
export const rooms=[{name:"Vestígios",subtitle:"A memória é um lugar em movimento."},{name:"Matéria",subtitle:"A forma é uma maneira de sentir."},{name:"Horizontes",subtitle:"O que existe para além da parede?"}];
export const artworks:Artwork[]=[
{id:"01",title:"Cartografias do Afeto",author:"Lia Campos",year:2026,room:0,type:"image",image:"/art/mapa.svg",description:"Linhas e territórios se cruzam em uma paisagem feita de lembranças."},
{id:"02",title:"Jardim Interno",author:"Lia Campos",year:2026,room:0,type:"image",image:"/art/jardim.svg",description:"O encontro entre formas orgânicas e os silêncios da natureza."},
{id:"03",title:"Forma de Passagem",author:"Caio Neves",year:2026,room:1,type:"model",description:"Um estudo tridimensional de curvas, torções e encontros."},
{id:"04",title:"Tempo Suspenso",author:"Caio Neves",year:2025,room:1,type:"image",image:"/art/tempo.svg",description:"Geometrias atravessadas pela luz e pelo movimento."},
{id:"05",title:"Outro Lado",author:"Nina Reis",year:2026,room:2,type:"image",image:"/art/lado.svg",description:"Novos horizontes se formam por sobreposição."},
{id:"06",title:"Horizonte de Dentro",author:"Nina Reis",year:2026,room:2,type:"image",image:"/art/horizonte.svg",description:"Uma superfície que guarda diferentes tempos e espaços."}
];