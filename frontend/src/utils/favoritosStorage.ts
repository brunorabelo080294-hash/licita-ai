// Gerenciamento e persistência de licitações favoritadas pelo empresário

const FAVORITOS_KEY = 'licita_ai_favoritos_ids';

/**
 * Retorna lista de IDs de licitações favoritadas salvas no localStorage
 */
export function getFavoritosIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Verifica se uma oportunidade específica está favoritada
 */
export function isOportunidadeFavorita(id: string): boolean {
  if (!id) return false;
  const favs = getFavoritosIds();
  return favs.includes(id);
}

/**
 * Alterna estado de favorito (adiciona ou remove) e dispara evento de sincronização global
 */
export function toggleFavoritoOportunidade(id: string): boolean {
  if (!id) return false;
  const favs = getFavoritosIds();
  let novosFavs: string[];
  let isNowFav: boolean;

  if (favs.includes(id)) {
    novosFavs = favs.filter(favId => favId !== id);
    isNowFav = false;
  } else {
    novosFavs = [...favs, id];
    isNowFav = true;
  }

  localStorage.setItem(FAVORITOS_KEY, JSON.stringify(novosFavs));
  window.dispatchEvent(new CustomEvent('favoritos_alterados', { 
    detail: { ids: novosFavs, alteradoId: id, isFavorito: isNowFav } 
  }));

  return isNowFav;
}

/**
 * Retorna contagem total de oportunidades favoritadas
 */
export function getFavoritosCount(): number {
  return getFavoritosIds().length;
}
