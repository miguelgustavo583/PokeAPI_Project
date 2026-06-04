import { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, Dimensions, Animated, StatusBar, ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import axios from 'axios';
import React from 'react';

const { width, height } = Dimensions.get('window');
const SLOT_SIZE  = (width / 2 - 48) / 3;
const CARD_SIZE  = (width - 48) / 4;

// ─── Types ────────────────────────────────────────────────────────────────────
type Pokemon = { index: string; nome: string; imagem: string; tipos: string[] };

// ─── Cores por tipo ───────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
    fire: '#FF6B35', water: '#4FC3F7', grass: '#66BB6A', electric: '#FFD54F',
    psychic: '#CE93D8', ice: '#80DEEA', dragon: '#7986CB', dark: '#546E7A',
    fairy: '#F48FB1', fighting: '#EF5350', flying: '#90CAF9', poison: '#AB47BC',
    ground: '#BCAAA4', rock: '#8D6E63', bug: '#8BC34A', ghost: '#7E57C2',
    steel: '#B0BEC5', normal: '#CFD8DC',
};
const tc = (t: string) => TYPE_COLORS[t] ?? '#90A4AE';

// ─── Slot vazio animado ───────────────────────────────────────────────────────
const EmptySlot = ({ side, index, active }: { side: 'left' | 'right'; index: number; active: boolean }) => {
    const pulse = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        if (!active) return;
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, [active]);

    return (
        <View style={[
            es.slot,
            { borderColor: active ? (side === 'left' ? '#EF5350' : '#4FC3F7') : '#1a2235' },
        ]}>
            <Animated.Text style={[es.plus, { opacity: pulse, color: side === 'left' ? '#EF5350' : '#4FC3F7' }]}>
                +
            </Animated.Text>
            <Text style={es.num}>{index + 1}</Text>
        </View>
    );
};
const es = StyleSheet.create({
    slot: { width: SLOT_SIZE, height: SLOT_SIZE + 8, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#080d14' },
    plus: { fontSize: 22, fontWeight: '900', lineHeight: 26 },
    num:  { color: '#1a2235', fontSize: 9, fontWeight: '700', marginTop: 2 },
});

// ─── Slot preenchido ──────────────────────────────────────────────────────────
const FilledSlot = ({ pokemon, side, onRemove }: { pokemon: Pokemon; side: 'left'|'right'; onRemove: () => void }) => {
    const color   = tc(pokemon.tipos[0]);
    const scaleIn = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(scaleIn, { toValue: 1, tension: 180, friction: 8, useNativeDriver: true }).start();
    }, []);

    return (
        <Animated.View style={[fs.wrap, { borderColor: color + '88', backgroundColor: color + '18' }, { transform: [{ scale: scaleIn }] }]}>
            <TouchableOpacity onPress={onRemove} style={fs.removeBtn}>
                <Text style={fs.removeText}>✕</Text>
            </TouchableOpacity>
            <Image source={{ uri: pokemon.imagem }} style={fs.img} resizeMode="contain" />
            <Text style={fs.name} numberOfLines={1}>{pokemon.nome}</Text>
        </Animated.View>
    );
};
const fs = StyleSheet.create({
    wrap:       { width: SLOT_SIZE, height: SLOT_SIZE + 8, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    removeBtn:  { position: 'absolute', top: 3, right: 4, zIndex: 10 },
    removeText: { color: '#ff6b6b', fontSize: 10, fontWeight: '900' },
    img:        { width: SLOT_SIZE - 8, height: SLOT_SIZE - 16 },
    name:       { color: '#e8f0fe', fontSize: 7, fontWeight: '700', textTransform: 'capitalize', textAlign: 'center', paddingHorizontal: 2 },
});

// ─── Card do grid de seleção ──────────────────────────────────────────────────
const PickCard = ({ pokemon, side, disabled, onPress }: {
    pokemon: Pokemon; side: 'left'|'right'; disabled: boolean; onPress: () => void;
}) => {
    const color  = tc(pokemon.tipos[0]);
    const accent = side === 'left' ? '#EF5350' : '#4FC3F7';
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.75}
            style={[pk.card, { borderColor: disabled ? '#0f1e2e' : color + '66', opacity: disabled ? 0.35 : 1 }]}
        >
            <Text style={pk.index}>#{pokemon.index}</Text>
            <Image source={{ uri: pokemon.imagem }} style={pk.img} resizeMode="contain" />
            <Text style={pk.name} numberOfLines={1}>{pokemon.nome}</Text>
            <View style={[pk.dot, { backgroundColor: color }]} />
        </TouchableOpacity>
    );
};
const pk = StyleSheet.create({
    card:  { width: CARD_SIZE, borderRadius: 12, borderWidth: 1, padding: 6, alignItems: 'center', backgroundColor: '#080d14', marginBottom: 10 },
    index: { color: '#1e3050', fontSize: 8, fontWeight: '700', alignSelf: 'flex-end', marginBottom: 2 },
    img:   { width: CARD_SIZE - 12, height: CARD_SIZE - 12 },
    name:  { color: '#e8f0fe', fontSize: 8, fontWeight: '700', textTransform: 'capitalize', textAlign: 'center', marginTop: 3 },
    dot:   { width: 5, height: 5, borderRadius: 3, marginTop: 3 },
});

// ─── VS separador ─────────────────────────────────────────────────────────────
const VsDivider = () => {
    const glowAnim = useRef(new Animated.Value(0.5)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0.5, duration: 900, useNativeDriver: true }),
        ])).start();
    }, []);
    return (
        <View style={vs.wrap}>
            <View style={vs.lineRed} />
            <Animated.Text style={[vs.text, { opacity: glowAnim }]}>VS</Animated.Text>
            <View style={vs.lineBlue} />
        </View>
    );
};
const vs = StyleSheet.create({
    wrap:     { width: 32, alignItems: 'center', justifyContent: 'center', gap: 3 },
    lineRed:  { width: 1.5, flex: 1, backgroundColor: '#EF535044' },
    lineBlue: { width: 1.5, flex: 1, backgroundColor: '#4FC3F744' },
    text:     { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1, textShadowColor: '#fff', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
});

// ─── Pokébola decorativa ──────────────────────────────────────────────────────
const Pokeball = ({ size = 24 }: { size?: number }) => (
    <View style={[{ width: size, height: size, borderRadius: size/2, overflow: 'hidden', borderWidth: 1.5, borderColor: '#1a1a2e' }]}>
        <View style={{ height: size*0.38, backgroundColor: '#EF5350' }} />
        <View style={{ height: size*0.14, backgroundColor: '#1a1a2e' }} />
        <View style={{ height: size*0.38, backgroundColor: '#f5f5f0' }} />
        <View style={{ position: 'absolute', width: size*0.28, height: size*0.28, borderRadius: size*0.14, backgroundColor: '#1a1a2e', top: size*0.33, left: size*0.36 }} />
    </View>
);

// ─── TEAM SELECT SCREEN ───────────────────────────────────────────────────────
export default function TeamSelect() {
    const router = useRouter();
    const [pokemons, setPokemons] = useState<Pokemon[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [leftTeam,  setLeftTeam]  = useState<(Pokemon|null)[]>([null, null, null]);
    const [rightTeam, setRightTeam] = useState<(Pokemon|null)[]>([null, null, null]);
    const [activeSide, setActiveSide] = useState<'left'|'right'>('left');
    const [ready, setReady] = useState(false);

    // Animações de entrada
    const leftPanelAnim  = useRef(new Animated.Value(-width/2)).current;
    const rightPanelAnim = useRef(new Animated.Value(width/2)).current;
    const gridAnim       = useRef(new Animated.Value(height)).current;
    const titleAnim      = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        axios.get('https://pokeapi.co/api/v2/pokemon?limit=151').then(async res => {
            const list: Pokemon[] = await Promise.all(
                res.data.results.map(async (p: { url: string }) => {
                    const { data } = await axios.get(p.url);
                    return {
                        nome:  data.name,
                        index: data.id.toString().padStart(3, '0'),
                        tipos: data.types.map((t: any) => t.type.name),
                        imagem: data.sprites.other['official-artwork'].front_default ?? data.sprites.front_default,
                    };
                })
            );
            setPokemons(list);
            setLoading(false);
            // Entrada animada
            Animated.parallel([
                Animated.spring(leftPanelAnim,  { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
                Animated.spring(rightPanelAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
                Animated.timing(gridAnim,   { toValue: 0,   duration: 600, delay: 300, useNativeDriver: true }),
                Animated.timing(titleAnim,  { toValue: 1,   duration: 500, delay: 100, useNativeDriver: true }),
            ]).start();
        });
    }, []);

    const allPicked = [...leftTeam, ...rightTeam].filter(Boolean).map(p => p!.index);

    const addToTeam = (pokemon: Pokemon) => {
        if (allPicked.includes(pokemon.index)) return;
        if (activeSide === 'left') {
            const idx = leftTeam.findIndex(p => p === null);
            if (idx === -1) return;
            const next = [...leftTeam];
            next[idx] = pokemon;
            setLeftTeam(next);
            if (next.every(Boolean)) setActiveSide('right');
        } else {
            const idx = rightTeam.findIndex(p => p === null);
            if (idx === -1) return;
            const next = [...rightTeam];
            next[idx] = pokemon;
            setRightTeam(next);
        }
    };

    const removeFromTeam = (side: 'left'|'right', idx: number) => {
        if (side === 'left') {
            const next = [...leftTeam]; next[idx] = null; setLeftTeam(next);
        } else {
            const next = [...rightTeam]; next[idx] = null; setRightTeam(next);
        }
    };

    const leftReady  = leftTeam.every(Boolean);
    const rightReady = rightTeam.every(Boolean);
    const bothReady  = leftReady && rightReady;

    const battleAnim = useRef(new Animated.Value(1)).current;
    const onBattle   = () => {
        Animated.sequence([
            Animated.timing(battleAnim, { toValue: 1.08, duration: 100, useNativeDriver: true }),
            Animated.timing(battleAnim, { toValue: 0.94, duration: 80,  useNativeDriver: true }),
            Animated.timing(battleAnim, { toValue: 1,    duration: 80,  useNativeDriver: true }),
        ]).start(() => setReady(true));
    };

    if (ready) return (
        <View style={s.readyScreen}>
            <StatusBar barStyle="light-content" />
            <Text style={s.readyTitle}>BATALHA!</Text>
            <View style={s.readyTeams}>
                <View style={s.readySide}>
                    {leftTeam.map((p, i) => p && (
                        <Image key={i} source={{ uri: p.imagem }} style={s.readyImg} resizeMode="contain" />
                    ))}
                </View>
                <Text style={s.readyVs}>VS</Text>
                <View style={s.readySide}>
                    {rightTeam.map((p, i) => p && (
                        <Image key={i} source={{ uri: p.imagem }} style={[s.readyImg, { transform: [{ scaleX: -1 }] }]} resizeMode="contain" />
                    ))}
                </View>
            </View>
            <TouchableOpacity onPress={() => setReady(false)} style={s.readyBack}>
                <Text style={s.readyBackText}>← Refazer Times</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={s.screen}>
            <StatusBar barStyle="light-content" />

            {/* Fundo split: vermelho esquerda / azul direita */}
            <View style={s.bgLeft}  />
            <View style={s.bgRight} />
            <View style={s.bgCenter} />

            {/* Título */}
            <Animated.View style={[s.titleWrap, { opacity: titleAnim }]}>
                <Pokeball size={18} />
                <Text style={s.title}>SELEÇÃO DE TIMES</Text>
                <Pokeball size={18} />
            </Animated.View>

            {/* ── Painéis de time ── */}
            <View style={s.teamsRow}>
                {/* Time VERMELHO */}
                <Animated.View style={[s.teamPanel, s.teamLeft, { transform: [{ translateX: leftPanelAnim }] }]}>
                    <TouchableOpacity onPress={() => setActiveSide('left')} style={[s.sideTab, activeSide === 'left' && s.sideTabActive]}>
                        <Text style={[s.sideTabText, activeSide === 'left' && { color: '#EF5350' }]}>🔴  TIME 1</Text>
                        {leftReady && <Text style={s.readyBadge}>✓</Text>}
                    </TouchableOpacity>
                    <View style={s.slots}>
                        {leftTeam.map((p, i) => p
                            ? <FilledSlot key={i} pokemon={p} side="left" onRemove={() => removeFromTeam('left', i)} />
                            : <EmptySlot  key={i} side="left" index={i} active={activeSide === 'left' && !leftReady} />
                        )}
                    </View>
                </Animated.View>

                {/* VS */}
                <VsDivider />

                {/* Time AZUL */}
                <Animated.View style={[s.teamPanel, s.teamRight, { transform: [{ translateX: rightPanelAnim }] }]}>
                    <TouchableOpacity onPress={() => setActiveSide('right')} style={[s.sideTab, activeSide === 'right' && s.sideTabActiveBlue]}>
                        <Text style={[s.sideTabText, activeSide === 'right' && { color: '#4FC3F7' }]}>TIME 2  🔵</Text>
                        {rightReady && <Text style={[s.readyBadge, { color: '#4FC3F7' }]}>✓</Text>}
                    </TouchableOpacity>
                    <View style={s.slots}>
                        {rightTeam.map((p, i) => p
                            ? <FilledSlot key={i} pokemon={p} side="right" onRemove={() => removeFromTeam('right', i)} />
                            : <EmptySlot  key={i} side="right" index={i} active={activeSide === 'right' && !rightReady} />
                        )}
                    </View>
                </Animated.View>
            </View>

            {/* Indicador de turno */}
            <View style={s.turnIndicator}>
                <View style={[s.turnDot, { backgroundColor: activeSide === 'left' ? '#EF5350' : '#4FC3F7' }]} />
                <Text style={s.turnText}>
                    Escolhendo para o {activeSide === 'left' ? 'Time 1 🔴' : 'Time 2 🔵'}
                    {'  ·  '}{activeSide === 'left'
                        ? `${leftTeam.filter(Boolean).length}/3`
                        : `${rightTeam.filter(Boolean).length}/3`}
                </Text>
            </View>

            {/* ── Grid de seleção ── */}
            {loading ? (
                <View style={s.loadWrap}>
                    <Text style={s.loadText}>Carregando Pokémon...</Text>
                </View>
            ) : (
                <Animated.View style={[s.gridWrap, { transform: [{ translateY: gridAnim }] }]}>
                    <FlatList
                        data={pokemons}
                        keyExtractor={p => p.index}
                        numColumns={4}
                        contentContainerStyle={s.grid}
                        columnWrapperStyle={{ gap: 8 }}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <PickCard
                                pokemon={item}
                                side={activeSide}
                                disabled={allPicked.includes(item.index)}
                                onPress={() => addToTeam(item)}
                            />
                        )}
                    />
                </Animated.View>
            )}

            {/* ── Botão BATALHAR ── */}
            {bothReady && (
                <Animated.View style={[s.battleWrap, { transform: [{ scale: battleAnim }] }]}>
                    <TouchableOpacity onPress={onBattle} style={s.battleBtn} activeOpacity={0.85}>
                        <Text style={s.battleText}>⚔️  BATALHAR!</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Botão voltar */}
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                <Text style={s.backText}>←</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Tela de batalha confirmada ───────────────────────────────────────────────
const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#050810' },

    // Fundo split
    bgLeft:   { position: 'absolute', top: 0, bottom: 0, left: 0,      width: '50%', backgroundColor: '#1a0505', opacity: 0.5 },
    bgRight:  { position: 'absolute', top: 0, bottom: 0, right: 0,     width: '50%', backgroundColor: '#030d1a', opacity: 0.5 },
    bgCenter: { position: 'absolute', top: 0, bottom: 0, left: '50%',  width: 1,     backgroundColor: '#ffffff10' },

    // Título
    titleWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 52, paddingBottom: 6 },
    title:     { color: '#e8f0fe', fontSize: 13, fontWeight: '900', letterSpacing: 3 },

    // Times
    teamsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },

    teamPanel: { flex: 1 },
    teamLeft:  {},
    teamRight: {},

    sideTab:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, marginBottom: 8, gap: 6 },
    sideTabActive:   { borderBottomWidth: 1.5, borderBottomColor: '#EF5350' },
    sideTabActiveBlue:{ borderBottomWidth: 1.5, borderBottomColor: '#4FC3F7' },
    sideTabText:     { color: '#3a5068', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    readyBadge:      { color: '#66BB6A', fontSize: 13, fontWeight: '900' },

    slots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },

    // Indicador de turno
    turnIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 6 },
    turnDot:       { width: 7, height: 7, borderRadius: 4 },
    turnText:      { color: '#3a5068', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

    // Grid
    gridWrap: { flex: 1 },
    grid:     { paddingHorizontal: 16, paddingBottom: 80 },

    // Loading
    loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadText: { color: '#3a5068', fontSize: 13, letterSpacing: 1 },

    // Botão batalhar
    battleWrap: { position: 'absolute', bottom: 20, left: 40, right: 40 },
    battleBtn:  {
        backgroundColor: '#EF5350',
        borderRadius: 14, paddingVertical: 15,
        alignItems: 'center',
        borderWidth: 1, borderColor: '#ff867c55',
        shadowColor: '#EF5350',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 14,
    },
    battleText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2 },

    // Botão voltar
    backBtn:  { position: 'absolute', top: 52, left: 16, padding: 8 },
    backText: { color: '#3a5068', fontSize: 18, fontWeight: '700' },

    // Tela de batalha
    readyScreen: { flex: 1, backgroundColor: '#050810', alignItems: 'center', justifyContent: 'center', gap: 16 },
    readyTitle:  { color: '#fff', fontSize: 42, fontWeight: '900', letterSpacing: 4, textShadowColor: '#EF5350', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
    readyTeams:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
    readySide:   { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
    readyImg:    { width: 70, height: 70 },
    readyVs:     { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
    readyBack:   { marginTop: 20, padding: 12 },
    readyBackText:{ color: '#3a5068', fontSize: 14, fontWeight: '700' },
});