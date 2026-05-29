import { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, ActivityIndicator, FlatList, TextInput,
    Dimensions, Animated, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';

const { width } = Dimensions.get('window');
const CARD_W    = (width - 48) / 2;

// ─── Types ────────────────────────────────────────────────────────────────────
type Poder   = { nome: string; forca: number };
type Pokemon = { index: string; nome: string; imagem: string; tipos: string[]; poderes: Poder[] };

// ─── Cores por tipo ───────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
    fire: '#FF6B35', water: '#4FC3F7', grass: '#66BB6A', electric: '#FFD54F',
    psychic: '#CE93D8', ice: '#80DEEA', dragon: '#7986CB', dark: '#546E7A',
    fairy: '#F48FB1', fighting: '#EF5350', flying: '#90CAF9', poison: '#AB47BC',
    ground: '#BCAAA4', rock: '#8D6E63', bug: '#8BC34A', ghost: '#7E57C2',
    steel: '#B0BEC5', normal: '#CFD8DC',
};
const tc = (t: string) => TYPE_COLORS[t] ?? '#90A4AE';

const STAT_LABELS: Record<string, string> = {
    hp: 'HP', attack: 'ATK', defense: 'DEF',
    'special-attack': 'SP.A', 'special-defense': 'SP.D', speed: 'VEL',
};

const FILTER_TYPES = ['fire','water','grass','electric','psychic','dragon','fighting','ghost','ice','dark','fairy'];

// ─── Pokébola decorativa ──────────────────────────────────────────────────────
const MiniPokeball = ({ size = 36 }: { size?: number }) => (
    <View style={[mpb.ball, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={[mpb.top,    { height: size * 0.38 }]} />
        <View style={[mpb.stripe, { height: size * 0.14 }]} />
        <View style={[mpb.bottom, { height: size * 0.38 }]} />
        <View style={[mpb.center, {
            width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14,
            top: size * 0.33, left: size * 0.36,
        }]} />
    </View>
);
const mpb = StyleSheet.create({
    ball:   { overflow: 'hidden', borderWidth: 2, borderColor: '#1a1a2e' },
    top:    { backgroundColor: '#EF5350' },
    stripe: { backgroundColor: '#1a1a2e' },
    bottom: { backgroundColor: '#f5f5f0' },
    center: { position: 'absolute', backgroundColor: '#1a1a2e' },
});

// ─── Barra de stat animada ────────────────────────────────────────────────────
const StatBar = ({ nome, forca, color }: { nome: string; forca: number; color: string }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, { toValue: forca / 255, duration: 800, useNativeDriver: false }).start();
    }, [forca]);
    const barW = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    return (
        <View style={sb.row}>
            <Text style={sb.label}>{STAT_LABELS[nome] ?? nome}</Text>
            <Text style={[sb.value, { color }]}>{forca}</Text>
            <View style={sb.track}>
                <Animated.View style={[sb.fill, { width: barW, backgroundColor: color }]} />
            </View>
        </View>
    );
};
const sb = StyleSheet.create({
    row:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    label: { color: '#3a5068', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, width: 46 },
    value: { fontSize: 13, fontWeight: '800', width: 32, textAlign: 'right' },
    track: { flex: 1, height: 4, backgroundColor: '#0f1820', borderRadius: 99, overflow: 'hidden' },
    fill:  { height: 4, borderRadius: 99 },
});

// ─── Card do grid ─────────────────────────────────────────────────────────────
const PokemonCard = ({ item, onPress }: { item: Pokemon; onPress: () => void }) => {
    const primary = tc(item.tipos[0]);
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={[card.wrap, { backgroundColor: primary + '1a', borderColor: primary + '55' }]}
        >
            <Text style={card.index}>#{item.index}</Text>
            <Image source={{ uri: item.imagem }} style={card.img} resizeMode="contain" />
            <Text style={card.name} numberOfLines={1}>{item.nome}</Text>
            <View style={card.types}>
                {item.tipos.map(t => (
                    <View key={t} style={[card.badge, { backgroundColor: tc(t) }]}>
                        <Text style={card.badgeText}>{t}</Text>
                    </View>
                ))}
            </View>
        </TouchableOpacity>
    );
};
const card = StyleSheet.create({
    wrap:      { width: CARD_W, borderRadius: 16, borderWidth: 1, padding: 12, alignItems: 'center' },
    index:     { alignSelf: 'flex-end', color: '#243044', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    img:       { width: 88, height: 88, marginVertical: 4 },
    name:      { color: '#e8f0fe', fontSize: 13, fontWeight: '800', textTransform: 'capitalize', marginBottom: 8 },
    types:     { flexDirection: 'row', gap: 5, flexWrap: 'wrap', justifyContent: 'center' },
    badge:     { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { color: '#fff', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});

// ─── Tela de detalhe ──────────────────────────────────────────────────────────
const DetailScreen = ({ pokemon, onBack, onPrev, onNext }: {
    pokemon: Pokemon;
    onBack: () => void;
    onPrev: () => void;
    onNext: () => void;
}) => {
    const fade  = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(30)).current;
    const primary   = tc(pokemon.tipos[0]);
    const totalBase = pokemon.poderes.reduce((a, p) => a + p.forca, 0);
    const numIndex  = parseInt(pokemon.index);

    useEffect(() => {
        fade.setValue(0); slide.setValue(30);
        Animated.parallel([
            Animated.timing(fade,  { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(slide, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();
    }, [pokemon.index]);

    return (
        <View style={{ flex: 1, backgroundColor: '#050810' }}>
            <View style={[det.heroBg,     { backgroundColor: primary + '1a' }]} />
            <View style={[det.heroBgCirc, { backgroundColor: primary + '12' }]} />

            <View style={det.header}>
                <TouchableOpacity onPress={onBack} style={det.backBtn}>
                    <Text style={det.backText}>← Lista</Text>
                </TouchableOpacity>
                <MiniPokeball size={38} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={det.scroll}>
                <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
                    {/* Imagem */}
                    <View style={det.hero}>
                        <Image source={{ uri: pokemon.imagem }} style={det.img} resizeMode="contain" />
                        <Text style={det.index}>#{pokemon.index}</Text>
                        <Text style={det.name}>{pokemon.nome}</Text>
                        <View style={det.typesRow}>
                            {pokemon.tipos.map(t => (
                                <View key={t} style={[det.badge, { backgroundColor: tc(t) }]}>
                                    <Text style={det.badgeText}>{t}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Total */}
                    <View style={[det.totalCard, { borderColor: primary + '44' }]}>
                        <Text style={det.totalLabel}>TOTAL BASE</Text>
                        <Text style={[det.totalValue, { color: primary }]}>{totalBase}</Text>
                    </View>

                    {/* Stats */}
                    <Text style={det.secLabel}>ATRIBUTOS</Text>
                    <View style={det.statsCard}>
                        {pokemon.poderes.map(p => (
                            <StatBar key={p.nome} nome={p.nome} forca={p.forca} color={primary} />
                        ))}
                    </View>

                    {/* Info grid */}
                    <Text style={[det.secLabel, { marginTop: 20 }]}>INFORMAÇÕES</Text>
                    <View style={det.infoGrid}>
                        {[
                            { icon: '❤️', label: 'HP',     color: '#EF5350', stat: 'hp'      },
                            { icon: '⚔️', label: 'ATAQUE', color: '#FFD54F', stat: 'attack'  },
                            { icon: '🛡️', label: 'DEFESA', color: '#4FC3F7', stat: 'defense' },
                            { icon: '⚡', label: 'VEL',    color: primary,   stat: 'speed'   },
                        ].map(({ icon, label, color, stat }) => (
                            <View key={stat} style={[det.infoCard, { borderColor: color + '44' }]}>
                                <Text style={{ fontSize: 20, marginBottom: 6 }}>{icon}</Text>
                                <Text style={[det.infoValue, { color }]}>
                                    {pokemon.poderes.find(p => p.nome === stat)?.forca ?? '—'}
                                </Text>
                                <Text style={det.infoLabel}>{label}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Navegação */}
                    <View style={det.navRow}>
                        {numIndex > 1 && (
                            <TouchableOpacity onPress={onPrev} style={[det.navBtn, { borderColor: primary + '55' }]}>
                                <Text style={[det.navText, { color: primary }]}>← Anterior</Text>
                            </TouchableOpacity>
                        )}
                        {numIndex < 151 && (
                            <TouchableOpacity onPress={onNext} style={[det.navBtn, { borderColor: primary + '55', marginLeft: 'auto' }]}>
                                <Text style={[det.navText, { color: primary }]}>Próximo →</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={{ height: 40 }} />
                </Animated.View>
            </ScrollView>
        </View>
    );
};

const det = StyleSheet.create({
    heroBg:    { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
    heroBgCirc:{ position: 'absolute', width: 260, height: 260, borderRadius: 130, top: -50, right: -50 },
    header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 8 },
    backBtn:   { padding: 8 },
    backText:  { color: '#e8f0fe', fontSize: 14, fontWeight: '700' },
    scroll:    { paddingHorizontal: 20 },
    hero:      { alignItems: 'center', paddingTop: 8, paddingBottom: 20 },
    img:       { width: 190, height: 190 },
    index:     { color: '#243044', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
    name:      { color: '#e8f0fe', fontSize: 28, fontWeight: '900', textTransform: 'capitalize', letterSpacing: -0.3, marginBottom: 10 },
    typesRow:  { flexDirection: 'row', gap: 10 },
    badge:     { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    totalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#080d14', borderRadius: 12, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 14, marginBottom: 8 },
    totalLabel:{ color: '#3a5068', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
    totalValue:{ fontSize: 24, fontWeight: '900' },
    secLabel:  { color: '#3a5068', fontSize: 9, fontWeight: '700', letterSpacing: 3, marginBottom: 12 },
    statsCard: { backgroundColor: '#080d14', borderRadius: 12, borderWidth: 0.5, borderColor: '#0f1e2e', padding: 16 },
    infoGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    infoCard:  { width: (width - 62) / 2, backgroundColor: '#080d14', borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center' },
    infoValue: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
    infoLabel: { color: '#3a5068', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
    navRow:    { flexDirection: 'row', marginTop: 24 },
    navBtn:    { backgroundColor: '#080d14', borderRadius: 10, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 12 },
    navText:   { fontSize: 13, fontWeight: '700' },
});

// ─── DASHBOARD — tela raiz com lista + detalhe ────────────────────────────────
export default function Dashboard() {
    const router = useRouter();

    const [pokemons,   setPokemons]   = useState<Pokemon[]>([]);
    const [filtered,   setFiltered]   = useState<Pokemon[]>([]);
    const [loading,    setLoading]    = useState(true);
    const [search,     setSearch]     = useState('');
    const [activeType, setActiveType] = useState<string | null>(null);
    const [selected,   setSelected]   = useState<Pokemon | null>(null);

    useEffect(() => {
        const load = async () => {
            const res  = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=151');
            const list: Pokemon[] = await Promise.all(
                res.data.results.map(async (p: { url: string }) => {
                    const { data } = await axios.get(p.url);
                    return {
                        nome:    data.name,
                        index:   data.id.toString().padStart(3, '0'),
                        tipos:   data.types.map((t: any) => t.type.name),
                        imagem:  data.sprites.other['official-artwork'].front_default ?? data.sprites.front_default,
                        poderes: data.stats.map((s: any) => ({ nome: s.stat.name, forca: s.base_stat })),
                    };
                })
            );
            setPokemons(list);
            setFiltered(list);
            setLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        let r = pokemons;
        if (search)     r = r.filter(p => p.nome.includes(search.toLowerCase()) || p.index.includes(search));
        if (activeType) r = r.filter(p => p.tipos.includes(activeType));
        setFiltered(r);
    }, [search, activeType, pokemons]);

    const navigate = (delta: number) => {
        if (!selected) return;
        const idx  = parseInt(selected.index) + delta;
        const next = pokemons.find(p => parseInt(p.index) === idx);
        if (next) setSelected(next);
    };

    // Tela de detalhe
    if (selected) return (
        <DetailScreen
            pokemon={selected}
            onBack={() => setSelected(null)}
            onPrev={() => navigate(-1)}
            onNext={() => navigate(1)}
        />
    );

    // Tela da lista
    return (
        <View style={ls.screen}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={ls.header}>
                <View>
                    <Text style={ls.eyebrow}>GERAÇÃO I  ·  151 POKÉMON</Text>
                    <Text style={ls.title}>Pokédex</Text>
                </View>
                <View style={ls.headerRight}>
                    <MiniPokeball size={44} />
                    <TouchableOpacity onPress={() => router.replace('/')} style={ls.exitBtn}>
                        <Text style={ls.exitText}>Sair</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Busca */}
            <View style={ls.searchWrap}>
                <Text style={{ fontSize: 13, marginRight: 8 }}>🔍</Text>
                <TextInput
                    style={ls.searchInput}
                    placeholder="Nome ou número..."
                    placeholderTextColor="#243044"
                    value={search}
                    onChangeText={setSearch}
                    autoCapitalize="none"
                />
                {search !== '' && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Text style={{ color: '#3a5068', paddingHorizontal: 8 }}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Filtros por tipo */}
            <FlatList
                horizontal
                data={FILTER_TYPES}
                keyExtractor={t => t}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={ls.filterList}
                renderItem={({ item: t }) => {
                    const active = activeType === t;
                    return (
                        <TouchableOpacity
                            onPress={() => setActiveType(active ? null : t)}
                            style={[ls.chip, { backgroundColor: active ? tc(t) : tc(t) + '22', borderColor: tc(t) + '66' }]}
                        >
                            <Text style={[ls.chipText, { color: active ? '#fff' : tc(t) }]}>{t}</Text>
                        </TouchableOpacity>
                    );
                }}
            />

            {loading ? (
                <View style={ls.loadWrap}>
                    <ActivityIndicator size="large" color="#EF5350" />
                    <Text style={ls.loadText}>Carregando Pokédex...</Text>
                </View>
            ) : (
                <>
                    <Text style={ls.count}>{filtered.length} encontrados</Text>
                    <FlatList
                        data={filtered}
                        keyExtractor={p => p.index}
                        numColumns={2}
                        contentContainerStyle={ls.grid}
                        columnWrapperStyle={{ gap: 12 }}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <PokemonCard item={item} onPress={() => setSelected(item)} />
                        )}
                    />
                </>
            )}
        </View>
    );
}

const ls = StyleSheet.create({
    screen:     { flex: 1, backgroundColor: '#050810' },
    header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 12 },
    eyebrow:    { color: '#EF5350', fontSize: 9, fontWeight: '700', letterSpacing: 2.5, marginBottom: 4 },
    title:      { color: '#e8f0fe', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
    headerRight:{ alignItems: 'center', gap: 8 },
    exitBtn:    { backgroundColor: '#0f1420', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 0.5, borderColor: '#1a2235' },
    exitText:   { color: '#EF5350', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#080d14', borderRadius: 12, borderWidth: 0.5, borderColor: '#0f1e2e', marginHorizontal: 16, paddingHorizontal: 14, marginBottom: 10 },
    searchInput:{ flex: 1, color: '#e8f0fe', fontSize: 14, paddingVertical: 11 },
    filterList: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
    chip:       { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },
    chipText:   { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
    count:      { color: '#1a3050', fontSize: 10, fontWeight: '600', letterSpacing: 1, paddingHorizontal: 20, marginBottom: 8 },
    grid:       { paddingHorizontal: 16, paddingBottom: 32 },
    loadWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
    loadText:   { color: '#3a5068', fontSize: 13, letterSpacing: 1 },
});