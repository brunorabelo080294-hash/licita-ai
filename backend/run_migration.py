from app.services.multiportal_service import migrar_colunas_portal_db, obter_estatisticas_portais

total = migrar_colunas_portal_db()
print(f"Total de certames catalogados por portal: {total}")

stats = obter_estatisticas_portais()
print("\nCertames abertos por portal de compras:")
for s in stats:
    if s["total_abertas"] > 0:
        print(f" - {s['nome']} ({s['slug']}): {s['total_abertas']} certames abertos")
