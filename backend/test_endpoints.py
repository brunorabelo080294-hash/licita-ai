import httpx

# Teste 1: portais
r_portais = httpx.get("http://localhost:8000/api/oportunidades/portais")
print("Status /portais:", r_portais.status_code)
portais_data = r_portais.json()
print(f"Total de portais retornados: {len(portais_data)}")
for p in portais_data[:5]:
    print(f" - {p['nome']} ({p['slug']}): {p['total_abertas']} abertas")

# Teste 2: catmat pesquisa
r_catmat = httpx.get("http://localhost:8000/api/precificacao/catmat/pesquisar?termo=cimento")
print("\nStatus /precificacao/catmat/pesquisar:", r_catmat.status_code)
cat_data = r_catmat.json()
print(f"CATMAT: {cat_data['codigo_catmat']} | {cat_data['descricao_item']}")
print(f" - Preço Médio: R$ {cat_data['preco_medio']} | Piso Mínimo: R$ {cat_data['preco_minimo']}")
print(f" - Top fornecedor: {cat_data['fornecedores_vencedores'][0]['razao_social']}")
