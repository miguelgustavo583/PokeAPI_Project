import { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image,
    Dimensions, Animated, StatusBar, FlatList, ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import axios from 'axios';
import React from 'react';

const { width, height } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
type Pokemon = { index: string; nome: string; imagem: string; tipos: string[]; hp: number; attack: number; speed: number };

// ─── Cores por tipo ───────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
    fire: '#FF6B35', water: '#4FC3F7', grass: '#66BB6A', electric: '#FFD54F',
    psychic: '#CE93D8', ice: '#80DEEA', dragon: '#7986CB', dark: '#546E7A',
    fairy: '#F48FB1', fighting: '#EF5350', flying: '#90CAF9', poison: '#AB47BC',
    ground: '#BCAAA4', rock: '#8D6E63', bug: '#8BC34A', ghost: '#7E57C2',
    steel: '#B0BEC5', normal: '#CFD8DC',
};
const tc = (t: string) => TYPE_COLORS[t] ?? '#90A4AE';

// ─── Pokébola animada ─────────────────────────────────────────────────────────
const PokeballThrow = ({ onEnd }: { onEnd: () => void }) => {
    const x    = useRef(new Animated.Value(0)).current;
    const y    = useRef(new Animated.Value(0)).current;
    const spin = useRef(new Animated.Value(0)).current;
    const fade = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.timing(x,    { toValue: width * 0.35, duration: 600, useNativeDriver: true }),
                Animated.timing(y,    { toValue: -height * 0.2, duration: 600, useNativeDriver: true }),
                Animated.timing(spin, { toValue: 3, duration: 600, useNativeDriver: true }),
            ]),
            Animated.timing(fade, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(onEnd);
    }, []);

    const rotate = spin.interpolate({ inputRange: [0, 3], outputRange: ['0deg', '1080deg'] });

    return (
        <Animated.View style={[pbt.ball, { transform: [{ translateX: x }, { translateY: y }, { rotate }], opacity: fade }]}>
            <View style={pbt.top}    />
            <View style={pbt.stripe} />
            <View style={pbt.bottom} />
            <View style={pbt.center} />
        </Animated.View>
    );
};
const pbt = StyleSheet.create({
    ball:   { position: 'absolute', bottom: 80, left: 30, width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 3, borderColor: '#1a1a2e', zIndex: 10 },
    top:    { height: 18, backgroundColor: '#EF5350' },
    stripe: { height: 8,  backgroundColor: '#1a1a2e' },
    bottom: { height: 18, backgroundColor: '#f5f5f0' },
    center: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: '#1a1a2e', top: 15, left: 15 },
});

// ─── Barra de HP ──────────────────────────────────────────────────────────────
const HpBar = ({ current, max, color }: { current: number; max: number; color: string }) => {
    const pct = Math.max(0, current / max);
    const barColor = pct > 0.5 ? '#66BB6A' : pct > 0.2 ? '#FFD54F' : '#EF5350';
    return (
        <View style={hp.wrap}>
            <View style={hp.track}>
                <View style={[hp.fill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
            </View>
            <Text style={[hp.text, { color: barColor }]}>{current}/{max}</Text>
        </View>
    );
};
const hp = StyleSheet.create({
    wrap:  { gap: 4 },
    track: { height: 6, backgroundColor: '#0f1820', borderRadius: 99, overflow: 'hidden' },
    fill:  { height: 6, borderRadius: 99 },
    text:  { fontSize: 10, fontWeight: '700', textAlign: 'right' },
});

// ─── Log de batalha ───────────────────────────────────────────────────────────
const BattleLog = ({ messages }: { messages: string[] }) => (
    <View style={bl.box}>
        {messages.slice(-3).map((m, i) => (
            <Text key={i} style={[bl.msg, i === messages.slice(-3).length - 1 && bl.latest]}>{m}</Text>
        ))}
    </View>
);
const bl = StyleSheet.create({
    box:    { backgroundColor: '#080d14', borderRadius: 12, borderWidth: 1, borderColor: '#0f1e2e', padding: 12, minHeight: 72, justifyContent: 'flex-end' },
    msg:    { color: '#3a5068', fontSize: 12, marginBottom: 2 },
    latest: { color: '#e8f0fe', fontWeight: '600' },
});

// ─── Card do time ─────────────────────────────────────────────────────────────
const TeamCard = ({ pokemon, onPress }: { pokemon: Pokemon; onPress: () => void }) => {
    const color = tc(pokemon.tipos[0]);
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}
            style={[tcard.wrap, { borderColor: color + '66', backgroundColor: color + '15' }]}>
            <Image source={{ uri: pokemon.imagem }} style={tcard.img} resizeMode="contain" />
            <Text style={tcard.name} numberOfLines={1}>{pokemon.nome}</Text>
            <Text style={tcard.index}>#{pokemon.index}</Text>
        </TouchableOpacity>
    );
};
const tcard = StyleSheet.create({
    wrap:  { width: (width - 56) / 3, borderRadius: 12, borderWidth: 1.5, padding: 8, alignItems: 'center' },
    img:   { width: 60, height: 60 },
    name:  { color: '#e8f0fe', fontSize: 9, fontWeight: '700', textTransform: 'capitalize', textAlign: 'center', marginTop: 4 },
    index: { color: '#3a5068', fontSize: 8, marginTop: 2 },
});

// ─── Pokébola pequena no card capturado ──────────────────────────────────────
const MiniPokeball = ({ size = 20 }: { size?: number }) => (
    <View style={{ width: size, height: size, borderRadius: size/2, overflow: 'hidden', borderWidth: 1.5, borderColor: '#1a1a2e' }}>
        <View style={{ height: size*0.38, backgroundColor: '#EF5350' }} />
        <View style={{ height: size*0.14, backgroundColor: '#1a1a2e' }} />
        <View style={{ height: size*0.38, backgroundColor: '#f5f5f0' }} />
        <View style={{ position: 'absolute', width: size*0.28, height: size*0.28, borderRadius: size*0.14, backgroundColor: '#1a1a2e', top: size*0.33, left: size*0.36 }} />
    </View>
);

// ─── ATAQUES fixos ────────────────────────────────────────────────────────────
const MOVES = [
    { name: 'Ataque Rápido', power: 40,  type: 'normal'   },
    { name: 'Golpe Forte',   power: 80,  type: 'fighting'  },
    { name: 'Especial',      power: 100, type: 'psychic'   },
    { name: 'Rajada',        power: 60,  type: 'flying'    },
];

// ─── SCREEN ───────────────────────────────────────────────────────────────────
type Screen = 'team' | 'battle' | 'capture' | 'result';

export default function CaptureZone() {
    const [screen,    setScreen]    = useState<Screen>('team');
    const [pokemons,  setPokemons]  = useState<Pokemon[]>([]);
    const [captured,  setCaptured]  = useState<Pokemon[]>([]);
    const [loading,   setLoading]   = useState(true);
    const [wild,      setWild]      = useState<Pokemon | null>(null);
    const [myPoke,    setMyPoke]    = useState<Pokemon | null>(null);
    const [wildHp,    setWildHp]    = useState(0);
    const [myHp,      setMyHp]      = useState(0);
    const [log,       setLog]       = useState<string[]>([]);
    const [throwing,  setThrowing]  = useState(false);
    const [resultWin, setResultWin] = useState(false);
    const [busy,      setBusy]      = useState(false);

    // Anims
    const wildShake  = useRef(new Animated.Value(0)).current;
    const myShake    = useRef(new Animated.Value(0)).current;
    const wildFade   = useRef(new Animated.Value(1)).current;
    const screenFade = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        axios.get('https://pokeapi.co/api/v2/pokemon?limit=151').then(async res => {
            const list: Pokemon[] = await Promise.all(
                res.data.results.map(async (p: { url: string }) => {
                    const { data } = await axios.get(p.url);
                    return {
                        nome:   data.name,
                        index:  data.id.toString().padStart(3, '0'),
                        tipos:  data.types.map((t: any) => t.type.name),
                        imagem: data.sprites.other['official-artwork'].front_default ?? data.sprites.front_default,
                        hp:     data.stats[0].base_stat,
                        attack: data.stats[1].base_stat,
                        speed:  data.stats[5].base_stat,
                    };
                })
            );
            setPokemons(list);
            setLoading(false);
        });
    }, []);

    const addLog = (msg: string) => setLog(prev => [...prev, msg]);

    const shake = (anim: Animated.Value) => {
        Animated.sequence([
            Animated.timing(anim, { toValue: 10,  duration: 60,  useNativeDriver: true }),
            Animated.timing(anim, { toValue: -10, duration: 60,  useNativeDriver: true }),
            Animated.timing(anim, { toValue: 6,   duration: 50,  useNativeDriver: true }),
            Animated.timing(anim, { toValue: -6,  duration: 50,  useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0,   duration: 40,  useNativeDriver: true }),
        ]).start();
    };

    // Escolhe Pokémon do time e inicia batalha contra selvagem aleatório
    const startBattle = (my: Pokemon) => {
        const available = pokemons.filter(p =>
            !captured.find(c => c.index === p.index) && p.index !== my.index
        );
        const wildPoke = available[Math.floor(Math.random() * available.length)];
        setMyPoke(my);
        setWild(wildPoke);
        setMyHp(my.hp);
        setWildHp(wildPoke.hp);
        wildFade.setValue(1);
        setLog([`Um ${wildPoke.nome} selvagem apareceu!`, `Vai, ${my.nome}!`]);
        setScreen('battle');
    };

    // Ataque do jogador
    const playerAttack = (power: number, moveName: string) => {
        if (!wild || !myPoke || busy) return;
        setBusy(true);
        const dmg = Math.max(1, Math.floor((myPoke.attack / wild.hp) * power * 1.2));
        const newWildHp = Math.max(0, wildHp - dmg);
        shake(wildShake);
        addLog(`${myPoke.nome} usou ${moveName}! Causou ${dmg} de dano.`);
        setWildHp(newWildHp);

        if (newWildHp <= 0) {
            addLog(`${wild.nome} foi derrotado! Agora capture-o!`);
            setBusy(false);
            setScreen('capture');
            return;
        }

        // Resposta do selvagem
        setTimeout(() => {
            const enemyDmg = Math.max(1, Math.floor((wild.attack / myPoke.hp) * 35));
            const newMyHp  = Math.max(0, myHp - enemyDmg);
            shake(myShake);
            addLog(`${wild.nome} contra-atacou! Você recebeu ${enemyDmg} de dano.`);
            setMyHp(newMyHp);

            if (newMyHp <= 0) {
                addLog(`${myPoke.nome} desmaiou! Você perdeu...`);
                setResultWin(false);
                setScreen('result');
            }
            setBusy(false);
        }, 900);
    };

    // Lança pokébola
    const throwBall = () => {
        if (!wild) return;
        setThrowing(true);
        setTimeout(() => {
            setThrowing(false);
            // Chance de captura: 60% + bônus se HP estava baixo
            const chance = 0.6 + (1 - wildHp / wild.hp) * 0.3;
            const caught = Math.random() < chance;
            if (caught) {
                setCaptured(prev => [...prev, wild]);
                addLog(`Você capturou ${wild.nome}!`);
                setResultWin(true);
            } else {
                addLog(`${wild.nome} escapou da pokébola!`);
                // Volta pra batalha com HP selvagem parcialmente recuperado
                setWildHp(prev => Math.min(wild.hp, prev + Math.floor(wild.hp * 0.15)));
            }
            setScreen(caught ? 'result' : 'battle');
        }, 1400);
    };

    // ── TELA: MEU TIME ────────────────────────────────────────────────────────
    if (screen === 'team') return (
        <View style={s.screen}>
            <StatusBar barStyle="light-content" />
            <View style={s.bgLeft} />
            <View style={s.bgRight} />

            <View style={s.header}>
                <Link href="/dashboard" asChild>
                    <TouchableOpacity style={s.backBtn}>
                        <Text style={s.backText}>←</Text>
                    </TouchableOpacity>
                </Link>
                <Text style={s.headerTitle}>ZONA DE CAPTURA</Text>
                <View style={{ width: 36 }} />
            </View>

            {/* Pokémon capturados */}
            {captured.length > 0 && (
                <>
                    <Text style={s.sectionLabel}>CAPTURADOS  ·  {captured.length}</Text>
                    <FlatList
                        horizontal
                        data={captured}
                        keyExtractor={p => p.index}
                        contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8 }}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <View style={cap.chip}>
                                <Image source={{ uri: item.imagem }} style={cap.img} resizeMode="contain" />
                                <MiniPokeball size={14} />
                                <Text style={cap.name}>{item.nome}</Text>
                            </View>
                        )}
                    />
                </>
            )}

            <Text style={s.sectionLabel}>ESCOLHA SEU POKÉMON PARA BATALHAR</Text>

            {loading ? (
                <View style={s.loadWrap}>
                    <Text style={s.loadText}>Carregando...</Text>
                </View>
            ) : (
                <FlatList
                    data={pokemons.slice(0, 30)}
                    keyExtractor={p => p.index}
                    numColumns={3}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
                    columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TeamCard pokemon={item} onPress={() => startBattle(item)} />
                    )}
                />
            )}
        </View>
    );

    // ── TELA: BATALHA ─────────────────────────────────────────────────────────
    if (screen === 'battle' && wild && myPoke) {
        const primaryWild = tc(wild.tipos[0]);
        const primaryMy   = tc(myPoke.tipos[0]);
        return (
            <View style={s.screen}>
                <StatusBar barStyle="light-content" />
                {/* Fundo split */}
                <View style={[s.bgLeft,  { backgroundColor: primaryWild + '18' }]} />
                <View style={[s.bgRight, { backgroundColor: primaryMy   + '18' }]} />

                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={() => setScreen('team')} style={s.backBtn}>
                        <Text style={s.backText}>← Fugir</Text>
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>BATALHA!</Text>
                    <View style={{ width: 60 }} />
                </View>

                <View style={s.battleField}>
                    {/* Pokémon selvagem (direita, invertido) */}
                    <View style={s.wildSide}>
                        <Text style={s.wildLabel}>SELVAGEM</Text>
                        <Text style={[s.pokeName, { color: primaryWild }]}>{wild.nome}</Text>
                        <HpBar current={wildHp} max={wild.hp} color={primaryWild} />
                        <Animated.Image
                            source={{ uri: wild.imagem }}
                            style={[s.battleImg, { transform: [{ scaleX: -1 }, { translateX: wildShake }] }]}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Meu Pokémon (esquerda) */}
                    <View style={s.mySide}>
                        <Text style={s.myLabel}>MEU POKÉMON</Text>
                        <Text style={[s.pokeName, { color: primaryMy }]}>{myPoke.nome}</Text>
                        <HpBar current={myHp} max={myPoke.hp} color={primaryMy} />
                        <Animated.Image
                            source={{ uri: myPoke.imagem }}
                            style={[s.battleImg, { transform: [{ translateX: myShake }] }]}
                            resizeMode="contain"
                        />
                    </View>
                </View>

                {/* Log */}
                <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                    <BattleLog messages={log} />
                </View>

                {/* Ataques */}
                <View style={s.movesGrid}>
                    {MOVES.map(m => (
                        <TouchableOpacity
                            key={m.name}
                            onPress={() => playerAttack(m.power, m.name)}
                            disabled={busy}
                            style={[s.moveBtn, { borderColor: tc(m.type) + '88', backgroundColor: tc(m.type) + '22', opacity: busy ? 0.5 : 1 }]}
                        >
                            <Text style={[s.moveName, { color: tc(m.type) }]}>{m.name}</Text>
                            <Text style={s.movePower}>PWR {m.power}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {throwing && <PokeballThrow onEnd={() => {}} />}
            </View>
        );
    }

    // ── TELA: CAPTURA ─────────────────────────────────────────────────────────
    if (screen === 'capture' && wild) {
        const primaryWild = tc(wild.tipos[0]);
        return (
            <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
                <StatusBar barStyle="light-content" />
                <View style={[s.bgLeft,  { backgroundColor: primaryWild + '15' }]} />
                <View style={[s.bgRight, { backgroundColor: primaryWild + '08' }]} />

                <Text style={s.captureTitle}>{wild.nome}</Text>
                <Text style={s.captureSubtitle}>está enfraquecido!</Text>

                <Animated.Image
                    source={{ uri: wild.imagem }}
                    style={s.captureImg}
                    resizeMode="contain"
                />

                <View style={{ paddingHorizontal: 16, width: '100%', marginBottom: 24 }}>
                    <BattleLog messages={log} />
                </View>

                <TouchableOpacity onPress={throwBall} style={s.throwBtn} activeOpacity={0.8}>
                    {/* Pokébola estilizada no botão */}
                    <View style={s.throwBallIcon}>
                        <View style={s.throwBallTop}    />
                        <View style={s.throwBallStripe} />
                        <View style={s.throwBallBottom} />
                        <View style={s.throwBallCenter} />
                    </View>
                    <Text style={s.throwText}>JOGAR POKÉBOLA!</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setScreen('battle')} style={s.continueBtn}>
                    <Text style={s.continueBtnText}>⚔️  Continuar Batalha</Text>
                </TouchableOpacity>

                {throwing && <PokeballThrow onEnd={() => {}} />}
            </View>
        );
    }

    // ── TELA: RESULTADO ───────────────────────────────────────────────────────
    if (screen === 'result') {
        return (
            <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
                <StatusBar barStyle="light-content" />
                <View style={[s.bgLeft,  { backgroundColor: resultWin ? '#66BB6A18' : '#EF535018' }]} />
                <View style={[s.bgRight, { backgroundColor: resultWin ? '#66BB6A08' : '#EF535008' }]} />

                <Text style={[s.resultEmoji]}>{resultWin ? '🎉' : '😵'}</Text>
                <Text style={[s.resultTitle, { color: resultWin ? '#66BB6A' : '#EF5350' }]}>
                    {resultWin ? 'CAPTURADO!' : 'VOCÊ PERDEU!'}
                </Text>

                {resultWin && wild && (
                    <>
                        <Image source={{ uri: wild.imagem }} style={s.resultImg} resizeMode="contain" />
                        <Text style={s.resultName}>{wild.nome} foi adicionado ao seu time!</Text>
                        <View style={s.resultBadge}>
                            <MiniPokeball size={16} />
                            <Text style={s.resultBadgeText}>#{wild.index}  ·  {wild.tipos[0]}</Text>
                        </View>
                    </>
                )}

                <Text style={s.capturedCount}>
                    Total capturado: {captured.length} Pokémon
                </Text>

                <View style={s.resultBtns}>
                    <TouchableOpacity onPress={() => setScreen('team')} style={s.resultBtnPrimary}>
                        <Text style={s.resultBtnPrimaryText}>⚔️  Nova Batalha</Text>
                    </TouchableOpacity>
                    <Link href="/dashboard" asChild>
                        <TouchableOpacity style={s.resultBtnSecondary}>
                            <Text style={s.resultBtnSecondaryText}>← Pokédex</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        );
    }

    return null;
}

// ─── Captured chip ────────────────────────────────────────────────────────────
const cap = StyleSheet.create({
    chip: { alignItems: 'center', backgroundColor: '#080d14', borderRadius: 10, borderWidth: 1, borderColor: '#0f1e2e', padding: 8, width: 72 },
    img:  { width: 44, height: 44, marginBottom: 4 },
    name: { color: '#e8f0fe', fontSize: 8, fontWeight: '700', textTransform: 'capitalize', textAlign: 'center' },
});

const s = StyleSheet.create({
    screen:  { flex: 1, backgroundColor: '#050810' },
    bgLeft:  { position: 'absolute', top: 0, bottom: 0, left: 0,     width: '50%', backgroundColor: '#1a0505', opacity: 0.6 },
    bgRight: { position: 'absolute', top: 0, bottom: 0, right: 0,    width: '50%', backgroundColor: '#030d1a', opacity: 0.6 },

    header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 8 },
    backBtn:     { padding: 8 },
    backText:    { color: '#e8f0fe', fontSize: 14, fontWeight: '700' },
    headerTitle: { color: '#e8f0fe', fontSize: 13, fontWeight: '900', letterSpacing: 3 },

    sectionLabel: { color: '#3a5068', fontSize: 9, fontWeight: '700', letterSpacing: 3, paddingHorizontal: 16, marginTop: 16, marginBottom: 10 },
    loadWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadText:     { color: '#3a5068', fontSize: 13, letterSpacing: 1 },

    // Battle
    battleField: { flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingTop: 8, gap: 8 },
    wildSide:    { flex: 1, alignItems: 'center', gap: 6 },
    mySide:      { flex: 1, alignItems: 'center', gap: 6 },
    wildLabel:   { color: '#EF5350', fontSize: 8, fontWeight: '700', letterSpacing: 2 },
    myLabel:     { color: '#4FC3F7', fontSize: 8, fontWeight: '700', letterSpacing: 2 },
    pokeName:    { fontSize: 13, fontWeight: '900', textTransform: 'capitalize', letterSpacing: 0.3 },
    battleImg:   { width: width * 0.38, height: width * 0.38 },

    movesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingBottom: 20 },
    moveBtn:   { width: (width - 52) / 2, borderRadius: 12, borderWidth: 1, paddingVertical: 13, paddingHorizontal: 14 },
    moveName:  { fontSize: 13, fontWeight: '800' },
    movePower: { color: '#3a5068', fontSize: 10, fontWeight: '600', marginTop: 2 },

    // Capture
    captureTitle:    { color: '#e8f0fe', fontSize: 26, fontWeight: '900', textTransform: 'capitalize', marginBottom: 4 },
    captureSubtitle: { color: '#3a5068', fontSize: 14, marginBottom: 8 },
    captureImg:      { width: 180, height: 180, marginBottom: 8 },

    throwBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#EF5350', borderRadius: 14,
        paddingVertical: 15, paddingHorizontal: 28,
        marginBottom: 12,
        shadowColor: '#EF5350', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 10,
    },
    throwBallIcon:   { width: 28, height: 28, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: '#1a1a2e' },
    throwBallTop:    { height: 10, backgroundColor: '#fff' },
    throwBallStripe: { height: 5,  backgroundColor: '#1a1a2e' },
    throwBallBottom: { height: 10, backgroundColor: '#EF5350' },
    throwBallCenter: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a1a2e', top: 10, left: 10 },
    throwText:       { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },

    continueBtn:     { padding: 12 },
    continueBtnText: { color: '#3a5068', fontSize: 13, fontWeight: '700' },

    // Result
    resultEmoji: { fontSize: 64, marginBottom: 8 },
    resultTitle: { fontSize: 32, fontWeight: '900', letterSpacing: 2, marginBottom: 16 },
    resultImg:   { width: 140, height: 140, marginBottom: 8 },
    resultName:  { color: '#e8f0fe', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
    resultBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#080d14', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 20 },
    resultBadgeText: { color: '#3a5068', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
    capturedCount:   { color: '#3a5068', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 28 },

    resultBtns:           { gap: 12, alignItems: 'center' },
    resultBtnPrimary:     { backgroundColor: '#EF5350', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
    resultBtnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
    resultBtnSecondary:   { padding: 12 },
    resultBtnSecondaryText:{ color: '#3a5068', fontSize: 13, fontWeight: '700' },
});