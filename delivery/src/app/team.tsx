import { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image,
    ScrollView, Dimensions, StatusBar, ActivityIndicator,
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React from 'react';

const { width } = Dimensions.get('window');

const BASE = 'https://lnh1dhp1mj.execute-api.us-east-1.amazonaws.com/api-pokemon';

const TYPE_COLORS: Record<string, string> = {
    fire: '#FF6B35', water: '#4FC3F7', grass: '#66BB6A', electric: '#FFD54F',
    psychic: '#CE93D8', ice: '#80DEEA', dragon: '#7986CB', dark: '#546E7A',
    fairy: '#F48FB1', fighting: '#EF5350', flying: '#90CAF9', poison: '#AB47BC',
    ground: '#BCAAA4', rock: '#8D6E63', bug: '#8BC34A', ghost: '#7E57C2',
    steel: '#B0BEC5', normal: '#CFD8DC',
};
const tc = (t: string) => TYPE_COLORS[t] ?? '#90A4AE';

type TeamPokemon = { index: string; name: string; image: string; tipos?: string[] };

const MiniPokeball = ({ size = 16 }: { size?: number }) => (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: 1.5, borderColor: '#1a1a2e' }}>
        <View style={{ height: size * 0.38, backgroundColor: '#EF5350' }} />
        <View style={{ height: size * 0.14, backgroundColor: '#1a1a2e' }} />
        <View style={{ height: size * 0.38, backgroundColor: '#f5f5f0' }} />
        <View style={{ position: 'absolute', width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14, backgroundColor: '#1a1a2e', top: size * 0.33, left: size * 0.36 }} />
    </View>
);

const PokemonCard = ({ pokemon }: { pokemon: TeamPokemon & { tipos: string[] } }) => {
    const color = tc(pokemon.tipos[0] ?? 'normal');
    const image = pokemon.image?.includes('/sprites/pokemon/')
        && !pokemon.image?.includes('official-artwork')
        ? pokemon.image.replace('/sprites/pokemon/', '/sprites/pokemon/other/official-artwork/')
        : pokemon.image;

    return (
        <View style={[pc.wrap, { borderColor: color + '55', backgroundColor: color + '12' }]}>
            <View style={[pc.glowCircle, { backgroundColor: color + '18' }]} />
            <Image source={{ uri: image }} style={pc.img} resizeMode="contain" />
            <Text style={pc.index}>#{pokemon.index}</Text>
            <Text style={[pc.name, { color }]} numberOfLines={1}>{pokemon.name}</Text>
            <View style={[pc.badge, { backgroundColor: color + '30' }]}>
                <Text style={[pc.badgeText, { color }]}>{pokemon.tipos[0] ?? '—'}</Text>
            </View>
        </View>
    );
};

const pc = StyleSheet.create({
    wrap:       { width: (width - 44) / 2, borderRadius: 18, borderWidth: 1.5, padding: 16, alignItems: 'center', marginBottom: 12, position: 'relative', overflow: 'hidden' },
    glowCircle: { position: 'absolute', width: 100, height: 100, borderRadius: 50, top: -20, right: -20 },
    img:        { width: 110, height: 110, marginBottom: 8 },
    index:      { color: '#3a5068', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
    name:       { fontSize: 13, fontWeight: '900', textTransform: 'capitalize', textAlign: 'center', marginBottom: 6 },
    badge:      { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    badgeText:  { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
});

const fetchTypes = async (name: string): Promise<string[]> => {
    try {
        const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`);
        return data.types.map((t: any) => t.type.name);
    } catch { return ['normal']; }
};

export default function TeamScreen() {
    const [team,    setTeam]    = useState<(TeamPokemon & { tipos: string[] })[]>([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    const loadTeam = async () => {
        try {
            const raw = await AsyncStorage.getItem('@pokemon_user');
            if (!raw) { setError('Usuário não encontrado.'); setLoading(false); return; }

            const user   = JSON.parse(raw);
            const userId = user.id ?? user.userId ?? user.user_id;

            // Adicionando bypass de cache com timestamp para forçar a API a devolver os dados em tempo real
            const { data } = await axios.get(`${BASE}/pokemon/v1/team`, {
                params: { 
                    'user-id': userId,
                    '_t': Date.now() 
                },
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            const teamArray: TeamPokemon[] = Array.isArray(data)
                ? data
                : Array.isArray(data?.team)
                    ? data.team
                    : [];

            const withTypes = await Promise.all(
                teamArray.map(async p => ({
                    ...p,
                    tipos: await fetchTypes(p.name),
                }))
            );

            setTeam(withTypes);
            setError('');
        } catch (e: any) {
            setError('Erro ao carregar o time.');
            console.log('Erro team:', e);
        } finally {
            setLoading(false);
        }
    };

    // useFocusEffect é a maneira oficial do Expo Router de recarregar dados quando a aba ganha foco
    useFocusEffect(
        useCallback(() => {
            loadTeam();
        }, [])
    );

    return (
        <View style={s.screen}>
            <StatusBar barStyle="light-content" />
            <View style={s.bgLeft} /><View style={s.bgRight} />

            <View style={s.header}>
                <Link href="/dashboard" asChild>
                    <TouchableOpacity style={s.backBtn}><Text style={s.backText}>← Pokédex</Text></TouchableOpacity>
                </Link>
                <Text style={s.headerTitle}>MEU TIME</Text>
                <Link href="/battle" asChild>
                    <TouchableOpacity style={s.battleBtn}><Text style={s.battleBtnText}>⚔️</Text></TouchableOpacity>
                </Link>
            </View>

            {loading && team.length === 0 ? (
                <View style={s.centered}>
                    <ActivityIndicator size="large" color="#EF5350" />
                    <Text style={s.loadText}>Sincronizando time...</Text>
                </View>
            ) : error ? (
                <View style={s.centered}><Text style={s.errorText}>{error}</Text></View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
                    <View style={s.countRow}>
                        <MiniPokeball size={18} />
                        <Text style={s.countText}>{team.length} POKÉMON NO TIME</Text>
                    </View>

                    {team.length === 0 ? (
                        <View style={s.emptyBox}>
                            <Text style={s.emptyTitle}>Time vazio</Text>
                            <Text style={s.emptySub}>Capture pokémon nas batalhas para formar seu time!</Text>
                        </View>
                    ) : (
                        <View style={s.grid}>
                            {team.map((p, i) => <PokemonCard key={i + p.name} pokemon={p} />)}
                        </View>
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    screen:  { flex: 1, backgroundColor: '#050810' },
    bgLeft:  { position: 'absolute', top: 0, bottom: 0, left: 0,  width: '50%', backgroundColor: '#1a0505', opacity: 0.4 },
    bgRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%', backgroundColor: '#030d1a', opacity: 0.4 },
    header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16 },
    backBtn:      { padding: 8 },
    backText:     { color: '#e8f0fe', fontSize: 14, fontWeight: '700' },
    headerTitle:  { color: '#e8f0fe', fontSize: 13, fontWeight: '900', letterSpacing: 3 },
    battleBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EF535022', borderWidth: 1.5, borderColor: '#EF5350', alignItems: 'center', justifyContent: 'center' },
    battleBtnText:{ fontSize: 18 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
    loadText: { color: '#3a5068', fontSize: 13, letterSpacing: 1 },
    errorText:{ color: '#EF5350', fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
    scroll:   { paddingHorizontal: 16, paddingTop: 8 },
    countRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    countText:{ color: '#3a5068', fontSize: 9, fontWeight: '700', letterSpacing: 3 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
    emptyBox:   { backgroundColor: '#080d14', borderRadius: 16, borderWidth: 0.5, borderColor: '#0f1e2e', padding: 32, alignItems: 'center', gap: 10 },
    emptyTitle: { color: '#3a5068', fontSize: 16, fontWeight: '800' },
    emptySub:   { color: '#1e3050', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});