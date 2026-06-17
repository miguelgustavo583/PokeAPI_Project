import axios from 'axios';

const BASE = 'https://lnh1dhp1mj.execute-api.us-east-1.amazonaws.com/api-pokemon';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const register = async (username: string, password: string) => {
    const { data } = await axios.post(`${BASE}/auth/v1/register`, { username, password });
    return data; // retorna { id, username, ... }
};

export const login = async (username: string, password: string) => {
    const { data } = await axios.post(`${BASE}/auth/v1/login`, { username, password });
    return data; // retorna { id, username, ... }
};

export const getStats = async (userId: string) => {
    const { data } = await axios.get(`${BASE}/auth/v1/stats/${userId}`);
    return data;
};

export const updateStats = async (userId: string, level: string, vitorias: string, derrotas: string) => {
    const { data } = await axios.put(`${BASE}/auth/v1/stats/${userId}`, { level, vitorias, derrotas });
    return data;
};

// ─── Time / Pokémon ───────────────────────────────────────────────────────────
export const getTeam = async (userId: string) => {
    const { data } = await axios.get(`${BASE}/pokemon/v1/team`, {
        params: { 'user-id': userId },
    });
    return data;
};

export const addCaptured = async (userId: string, pokemonId: number) => {
    const { data } = await axios.put(`${BASE}/pokemon/v1/captured`, null, {
        params: { 'user-id': userId, 'pokemon-id': pokemonId },
    });
    return data;
};

export const deleteCaptured = async (userId: string, pokemonId: number) => {
    const { data } = await axios.delete(`${BASE}/pokemon/v1/captured`, {
        params: { 'user-id': userId, 'pokemon-id': pokemonId },
    });
    return data;
};

// ─── Sorteia 5 IDs únicos entre 1-151 ────────────────────────────────────────
export const randomPokemonIds = (): number[] => {
    const ids: number[] = [];
    while (ids.length < 5) {
        const id = Math.floor(Math.random() * 151) + 1;
        if (!ids.includes(id)) ids.push(id);
    }
    return ids;
};