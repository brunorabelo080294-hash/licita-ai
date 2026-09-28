from app.services.catmat_core import buscar_historico_catmat, calcular_cenarios_lance

# Teste 1: busca por termo
res1 = buscar_historico_catmat("cimento portland para obra", "construcao")
print("Teste 1 (Cimento):", res1["codigo_catmat"], "|", res1["descricao_item"])
print(" - Preço Mínimo:", res1["preco_minimo"], "| Médio:", res1["preco_medio"], "| Máximo:", res1["preco_maximo"])
print(" - Fornecedores vencedores:", len(res1["fornecedores_vencedores"]))
for f in res1["fornecedores_vencedores"]:
    print(f"   * {f['razao_social']} | R$ {f['preco_unitario_homologado']} | {f['orgao_comprador']}")

# Teste 2: cenários de lance
cenarios = calcular_cenarios_lance(preco_teto_edital=45.0, custo_informado=28.0, frete_unitario=2.0, historico_catmat=res1)
print("\nCenários de Viabilidade:")
print(" - Agressivo:", cenarios["cenarios"]["agressivo"]["lance_unitario"], f"({cenarios['cenarios']['agressivo']['margem_percentual']}%)")
print(" - Estratégico:", cenarios["cenarios"]["estrategico"]["lance_unitario"], f"({cenarios['cenarios']['estrategico']['margem_percentual']}%)")
print(" - Conservador:", cenarios["cenarios"]["conservador"]["lance_unitario"], f"({cenarios['cenarios']['conservador']['margem_percentual']}%)")
