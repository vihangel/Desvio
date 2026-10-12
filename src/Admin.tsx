import {useState} from "react";
import {artists,artworks as defaultWorks,rooms,type Artwork} from "./data";
import {Save,RotateCcw,ImagePlus} from "lucide-react";
type Props={works:Artwork[];onChange:(works:Artwork[])=>void};
const newRecord=():Artwork=>({id:"local-"+Date.now(),title:"Nova obra",author:"Artista convidado",year:2026,room:0,type:"image",image:"/art/desvio-fios.svg",description:"",kind:"Quadro",rights:"demo"});
export default function Admin({works,onChange}:Props){
 const[tab,setTab]=useState<"obras"|"artistas"|"salas">("obras");
 const[draft,setDraft]=useState<Artwork|null>(null);
 const[notice,setNotice]=useState("");
 const[status,setStatus]=useState(()=>localStorage.getItem("desvio:status")||"Rascunho");
 const[begin,setBegin]=useState(()=>localStorage.getItem("desvio:begin")||"");
 const[end,setEnd]=useState(()=>localStorage.getItem("desvio:end")||"");
 const save=()=>{if(!draft?.title.trim())return;onChange(works.some(w=>w.id===draft.id)?works.map(w=>w.id===draft.id?draft:w):[...works,draft]);setDraft(null);setNotice("Salvo localmente no seu navegador.")};
 const upload=(file?:File)=>{if(!file||!draft)return;if(!file.type.startsWith("image/")||file.size>1000000){setNotice("Nesta versão, use imagens de até 1 MB.");return}const reader=new FileReader();reader.onload=()=>setDraft(d=>d?{...d,image:String(reader.result),rights:"demo"}:d);reader.readAsDataURL(file)};
 const uploadGlb=(file?:File)=>{if(!file||!draft)return;if(!file.name.toLowerCase().endsWith(".glb")||file.size>12000000){setNotice("Selecione um arquivo GLB de até 12 MB.");return}const url=URL.createObjectURL(file);setDraft(d=>d?{...d,modelUrl:url,type:"model",rights:"demo"}:d);setNotice("GLB preparado para a sessão atual. Salve para visualizar na sala.")};
 return <main className="admin">
 <div className="eyebrow">DESVIO · GESTÃO DO ACERVO</div>
 <h1>Curadoria e organização</h1><p>Modo de demonstração. Sem Supabase ou autenticação. Alterações são locais e não ficam públicas para outros visitantes.</p>
 <div className="admin-tabs"><button className={tab==="obras"?"active":""} onClick={()=>setTab("obras")}>Obras ({works.length})</button><button className={tab==="artistas"?"active":""} onClick={()=>setTab("artistas")}>Artistas ({artists.length})</button><button className={tab==="salas"?"active":""} onClick={()=>setTab("salas")}>Exposição e salas</button></div>
 {notice&&<p className="editor-feedback" role="status">{notice}</p>}
 {tab==="obras"&&<div className="admin-workspace"><section className="admin-records">
 <div className="admin-heading"><h2>Registros</h2><button className="primary" onClick={()=>setDraft(newRecord())}>+ Adicionar</button></div>
 {works.map(w=><button key={w.id} className={draft?.id===w.id?"record active":"record"} onClick={()=>setDraft({...w})}>{w.image?<img src={w.image} alt=""/>:<span className="record-icon">◈</span>}<span><b>{w.title}</b><small>{w.author} · {rooms[w.room]?.name} · {w.kind||"Obra"}</small></span></button>)}
 <button className="reset-link" onClick={()=>{onChange(defaultWorks);setDraft(null);setNotice("Acervo original restaurado.")}}><RotateCcw size={16}/> Restaurar acervo de exemplo</button>
 </section><section className="editor-panel">{draft?<><h2>{works.some(w=>w.id===draft.id)?"Editar registro":"Adicionar registro"}</h2>
 <label>Título<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
 <label>Artista<input value={draft.author} onChange={e=>setDraft({...draft,author:e.target.value})}/></label>
 <div className="editor-two"><label>Ano<input type="number" value={draft.year??""} onChange={e=>setDraft({...draft,year:e.target.value?Number(e.target.value):null})}/></label>
 <label>Sala<select value={draft.room} onChange={e=>setDraft({...draft,room:Number(e.target.value)})}>{rooms.map((r,i)=><option value={i} key={r.name}>{r.name}</option>)}</select></label></div>
 <label>Categoria<input value={draft.kind||""} onChange={e=>setDraft({...draft,kind:e.target.value})}/></label>
 <label>Descrição<textarea rows={5} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
 <label>Fonte documental<input type="url" placeholder="https://" value={draft.source||""} onChange={e=>setDraft({...draft,source:e.target.value})}/></label>
 <label className="upload-label"><ImagePlus size={18}/> Imagem local<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>upload(e.target.files?.[0])}/></label>
 <label>Modelo 3D (URL pública GLB)<input type="text" placeholder="https://.../modelo.glb" value={draft.modelUrl||""} onChange={e=>setDraft({...draft,modelUrl:e.target.value,type:"model"})}/></label><label className="upload-label">GLB local para teste<input type="file" accept=".glb,model/gltf-binary" onChange={e=>uploadGlb(e.target.files?.[0])}/></label><small className="editor-hint">A imagem pequena fica neste navegador. Arquivos GLB locais funcionam apenas durante a sessão, precisam ser enviados novamente depois de recarregar. Vídeo, áudio e GLB persistentes serão armazenados no Supabase Storage.</small>
 <div className="editor-actions"><button className="primary" onClick={save}><Save size={16}/> Salvar</button><button className="outline" onClick={()=>setDraft(null)}>Cancelar</button>{draft.id.startsWith("local-")&&works.some(w=>w.id===draft.id)&&<button className="danger" onClick={()=>{onChange(works.filter(w=>w.id!==draft.id));setDraft(null)}}>Excluir</button>}</div>
 </>:<div className="empty-editor"><h2>Selecione uma obra</h2><p>Edite o cadastro, mude de sala ou crie um painel demonstrativo.</p></div>}</section></div>}
 {tab==="artistas"&&<div className="artist-grid">{artists.map(a=><article key={a.id}><small>{a.location}</small><h2>{a.name}</h2><p>{a.bio}</p><a href={a.source} target="_blank" rel="noopener noreferrer">Fonte de pesquisa ↗</a></article>)}</div>}
 {tab==="salas"&&<div className="room-admin"><h2>Corpos, fios e territórios</h2><p>As opções a seguir simulam o ciclo de uma exposição temporária. Não publicam nem arquivam dados no servidor.</p><div className="room-admin-grid"><label>Estado<select value={status} onChange={e=>{setStatus(e.target.value);localStorage.setItem("desvio:status",e.target.value)}}><option>Rascunho</option><option>Publicada (simulação)</option><option>Arquivada (simulação)</option></select></label><label>Início<input type="date" value={begin} onChange={e=>{setBegin(e.target.value);localStorage.setItem("desvio:begin",e.target.value)}}/></label><label>Encerramento<input type="date" min={begin} value={end} onChange={e=>{setEnd(e.target.value);localStorage.setItem("desvio:end",e.target.value)}}/></label></div>{rooms.map((r,i)=><article key={r.name}><b>Sala {i+1} · {r.name}</b><span>{r.subtitle}</span><small>{works.filter(w=>w.room===i).length} registros</small></article>)}</div>}
 </main>;
}