import json
import re
from datetime import datetime
from pathlib import Path

def converter_url_pncp(numero_controle: str) -> str:
    if not numero_controle:
        return "https://pncp.gov.br"
    m = re.match(r"^(\d+)-(\d+)-(\d+)/(\d{4})$", numero_controle.strip())
    if m:
        cnpj, tipo, seq, ano = m.groups()
        return f"https://pncp.gov.br/app/editais/{cnpj}/{ano}/{seq}"
    return f"https://pncp.gov.br/app/editais/{numero_controle}"

def mapear_slug_modalidade(nome: str, codigo: int = None) -> str:
    n = (nome or "").lower()
    if codigo == 8 or "dispensa" in n:
        return "dispensa"
    if codigo in (6, 7) or "preg" in n:
        return "pregao"
    if codigo in (4, 5) or "concorr" in n:
        return "concorrencia"
    if codigo == 9 or "inexig" in n:
        return "inexigibilidade"
    if codigo in (1, 13) or "leil" in n:
        return "leilao"
    if codigo == 3 or "concurso" in n:
        return "concurso"
    if codigo == 2 or "diálogo" in n or "dialogo" in n:
        return "dialogo_competitivo"
    if codigo == 12 or "credenciamento" in n:
        return "credenciamento"
    return "srp" if "registro de pre" in n else "dispensa"

def main():
    orig_path = Path("backend/app/data/oportunidades_pncp_reais.json")
    novos_path = Path("backend/novas_licitacoes_pequenos_municipios.json")
    
    if not novos_path.exists():
        print("Arquivo de novos itens ainda não disponível.")
        return
        
    with open(orig_path, "r", encoding="utf-8") as f:
        existentes = json.load(f)
        
    with open(novos_path, "r", encoding="utf-8") as f:
        novos_brutos = json.load(f)
        
    print(f"Existentes: {len(existentes)} | Novos brutos coletados: {len(novos_brutos)}")
    
    ids_existentes = {str(x.get("id")) for x in existentes}
    adicionados = 0
    
    for it in novos_brutos:
        pid = it.get("numeroControlePNCP") or str(it.get("id", ""))
        if not pid or pid in ids_existentes:
            continue
            
        mun_info = it.get("_custom_mun", {})
        unidade = it.get("unidadeOrgao", {}) or {}
        orgao = it.get("orgaoEntidade", {}) or {}
        
        nome_mun = mun_info.get("nome") or unidade.get("municipioNome") or it.get("municipioNome")
        uf_mun = mun_info.get("uf") or unidade.get("ufSigla") or it.get("ufSigla")
        lat = mun_info.get("lat") or -21.95
        lon = mun_info.get("lon") or -42.00
        ibge = mun_info.get("ibge") or str(unidade.get("codigoIbge", ""))
        
        objeto = it.get("objetoCompra", "")
        resumo = objeto[:130] + "..." if len(objeto) > 130 else objeto
        
        mod_nome = it.get("modalidadeNome", "")
        mod_cod = it.get("modalidadeId") or it.get("codigoModalidadeContratacao")
        
        dt_ini = it.get("dataAberturaProposta") or it.get("dataPublicacaoPncp") or datetime.now().isoformat()
        dt_fim = it.get("dataEncerramentoProposta") or datetime.now().isoformat()
        try:
            dt_fim_parsed = datetime.fromisoformat(dt_fim.replace("Z", ""))
        except Exception:
            dt_fim_parsed = None

        novo_formatado = {
            "id": pid,
            "numeroControlePNCP": pid,
            "municipio": {
                "nome": nome_mun,
                "uf": uf_mun,
                "codigoIbge": ibge,
                "latitude": lat,
                "longitude": lon
            },
            "orgao": orgao.get("razaoSocial") or it.get("orgao", f"Prefeitura Municipal de {nome_mun}"),
            "numeroProcesso": it.get("processo") or "Proc. Oficial",
            "numeroEdital": f"{mod_nome} nº {it.get('numeroCompra', '01')}",
            "categoria": "geral",
            "objetoOriginal": objeto,
            "objetoResumido": resumo,
            "valorMaximo": float(it.get("valorTotalEstimado") or 0.0),
            "modalidade": mapear_slug_modalidade(mod_nome, mod_cod),
            "dataAbertura": dt_ini,
            "dataEncerramento": dt_fim,
            "statusPrazo": "aberta" if (dt_fim_parsed and dt_fim_parsed > datetime.now()) else "encerrada",
            "urlEdital": it.get("linkSistemaOrigem") or converter_url_pncp(pid),
            "urlPncp": converter_url_pncp(pid),
            "linkSistemaOrigem": it.get("linkSistemaOrigem") or converter_url_pncp(pid),
            "nomeSistemaOrigem": "Portal PNCP Oficial",
            "exclusivoMpe": bool(it.get("exclusivoMpe", True)),
            "distanciaKm": 0,
            "vantagemLc123": True,
            "cidadeAlvo": nome_mun
        }
        
        existentes.insert(0, novo_formatado) # insere no topo
        ids_existentes.add(pid)
        adicionados += 1
        
    print(f"Total adicionados: {adicionados} | Total consolidado: {len(existentes)}")
    
    # Salva no backend
    with open(orig_path, "w", encoding="utf-8") as f:
        json.dump(existentes, f, ensure_ascii=False, indent=2)
        
    # Salva no frontend json
    front_json = Path("frontend/src/data/oportunidadesPncpReais.json")
    if front_json.exists():
        with open(front_json, "w", encoding="utf-8") as f:
            json.dump(existentes, f, ensure_ascii=False, indent=2)
            
    # Atualiza mockData.ts
    mock_ts = Path("frontend/src/data/mockData.ts")
    if mock_ts.exists():
        with open(mock_ts, "r", encoding="utf-8") as f:
            ts_content = f.read()
            
        # Localiza mockOportunidades = [ ... ]
        m = re.search(r"export const mockOportunidades: Oportunidade\[\] = (\[.*?\]);", ts_content, re.DOTALL)
        if m:
            json_str = json.dumps(existentes, ensure_ascii=False, indent=2)
            new_ts = ts_content[:m.start(1)] + json_str + ts_content[m.end(1):]
            with open(mock_ts, "w", encoding="utf-8") as f:
                f.write(new_ts)
            print("mockData.ts atualizado com sucesso!")

if __name__ == "__main__":
    main()
