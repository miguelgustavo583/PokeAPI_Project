import { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image,
    Animated, StatusBar, ScrollView, ActivityIndicator, Dimensions
} from 'react-native';
import { Link } from 'expo-router';
import axios from 'axios';
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTeam, addCaptured, getStats, updateStats } from '../integration/authIntegration';

// ─── Types ────────────────────────────────────────────────────────────────────
type Stat    = { nome: string; forca: number };
type Pokemon = { index: string; nome: string; imagem: string; tipos: string[]; poderes: Stat[] };
type BattleState = 'LOADING' | 'IDLE' | 'SEARCHING' | 'FOUND' | 'BATTLING' | 'REWARD' | 'LOSS';

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

const DUEL_STATS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

// ─── Pokébola ─────────────────────────────────────────────────────────────────
const MiniPokeball = ({ size = 28 }: { size?: number }) => (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: 2, borderColor: '#1a1a2e' }}>
        <View style={{ height: size * 0.38, backgroundColor: '#EF5350' }} />
        <View style={{ height: size * 0.14, backgroundColor: '#1a1a2e' }} />
        <View style={{ height: size * 0.38, backgroundColor: '#f5f5f0' }} />
        <View style={{ position: 'absolute', width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14, backgroundColor: '#1a1a2e', top: size * 0.33, left: size * 0.36 }} />
    </View>
);

// ─── Pokébola animada (arremesso) ─────────────────────────────────────────────
const ThrowBall = ({ onEnd }: { onEnd: () => void }) => {
    const x    = useRef(new Animated.Value(0)).current;
    const y    = useRef(new Animated.Value(0)).current;
    const spin = useRef(new Animated.Value(0)).current;
    const fade = useRef(new Animated.Value(1)).current;
    
    // Fallbacks para as animações funcionarem em diversas telas
    const screenW = Dimensions.get('window').width;
    const screenH = Dimensions.get('window').height;

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.timing(x,    { toValue: screenW * 0.38, duration: 700, useNativeDriver: true }),
                Animated.timing(y,    { toValue: -screenH * 0.22, duration: 700, useNativeDriver: true }),
                Animated.timing(spin, { toValue: 3, duration: 700, useNativeDriver: true }),
            ]),
            Animated.timing(fade, { toValue: 0, duration: 280, useNativeDriver: true }),
        ]).start(onEnd);
    }, []);

    const rotate = spin.interpolate({ inputRange: [0, 3], outputRange: ['0deg', '1080deg'] });

    return (
        <Animated.View style={[
            tb.ball,
            { transform: [{ translateX: x }, { translateY: y }, { rotate }], opacity: fade },
        ]}>
            <View style={tb.top}    />
            <View style={tb.stripe} />
            <View style={tb.bottom} />
            <View style={tb.center} />
        </Animated.View>
    );
};
const tb = StyleSheet.create({
    ball:   { position: 'absolute', bottom: 100, left: 28, width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 3, borderColor: '#1a1a2e', zIndex: 20 },
    top:    { height: 18, backgroundColor: '#EF5350' },
    stripe: { height: 8,  backgroundColor: '#1a1a2e' },
    bottom: { height: 18, backgroundColor: '#f5f5f0' },
    center: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: '#1a1a2e', top: 15, left: 15 },
});

// ─── Log de batalha ───────────────────────────────────────────────────────────
const BattleLog = ({ messages }: { messages: string[] }) => (
    <View style={bl.box}>
        {messages.slice(-3).reverse().map((m, i) => (
            <Text key={i} style={[bl.msg, i === 0 && bl.latest]}>{m}</Text>
        ))}
    </View>
);
const bl = StyleSheet.create({
    box:    { backgroundColor: '#080d14', borderRadius: 12, borderWidth: 1, borderColor: '#0f1e2e', padding: 12, minHeight: 74 },
    msg:    { color: '#3a5068', fontSize: 11, marginBottom: 2 },
    latest: { color: '#e8f0fe', fontWeight: '600', fontSize: 12 },
});

// ─── Card do lutador (Refatorado para Web/Mobile Responsivo) ──────────────────
const FighterCard = ({
    pokemon, side, chosenStat,
}: {
    pokemon: Pokemon; side: 'player' | 'opponent'; chosenStat: string;
}) => {
    const color = tc(pokemon.tipos[0]);
    const flip  = side === 'opponent';

    return (
        <View style={[fc.wrap, { borderColor: color + '44', backgroundColor: color + '10' }]}>
            {/* O container da imagem absorve o espaço livre, impedindo a imagem de vazar */}
            <View style={fc.imgContainer}>
                <Image
                    source={{ uri: pokemon.imagem }}
                    style={[fc.img, flip && { transform: [{ scaleX: -1 }] }]}
                    resizeMode="contain"
                />
            </View>
            <Text style={[fc.name, { color }]} numberOfLines={1}>{pokemon.nome}</Text>
            <View style={fc.stats}>
                {DUEL_STATS.map(stat => {
                    const val        = pokemon.poderes.find(p => p.nome === stat)?.forca ?? 0;
                    const highlighted = chosenStat === stat;
                    return (
                        <View key={stat} style={[fc.statRow, highlighted && { backgroundColor: color + '22', borderColor: color + '88', borderWidth: 1 }]}>
                            <Text style={[fc.statName, highlighted && { color }]}>{STAT_LABELS[stat] ?? stat}</Text>
                            <Text style={[fc.statVal,  highlighted && { color, fontSize: 13 }]}>{val}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};
const fc = StyleSheet.create({
    wrap:    { flex: 1, borderRadius: 14, borderWidth: 1, padding: 10, alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
    imgContainer: { flex: 1, width: '100%', minHeight: 60, justifyContent: 'center', alignItems: 'center' },
    img:     { width: '100%', height: '100%' },
    name:    { fontSize: 12, fontWeight: '900', textTransform: 'capitalize', letterSpacing: 0.3, marginVertical: 6, textAlign: 'center' },
    stats:   { width: '100%', gap: 4, flexShrink: 0 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderColor: 'transparent', borderWidth: 1 },
    statName:{ color: '#3a5068', fontSize: 9, fontWeight: '700' },
    statVal: { color: '#e8f0fe', fontSize: 11, fontWeight: '800' },
});

// ─── Busca pokémon completo da PokeAPI ─────────────────────────────────────────
const fetchPokemon = async (idOrName: number | string): Promise<Pokemon | null> => {
    try {
        const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${idOrName}`);
        return {
            nome:    data.name,
            index:   data.id.toString().padStart(3, '0'),
            tipos:   data.types.map((t: any) => t.type.name),
            imagem:  data.sprites.other['official-artwork'].front_default ?? data.sprites.front_default,
            poderes: data.stats.map((s: any) => ({ nome: s.stat.name, forca: s.base_stat })),
        };
    } catch { return null; }
};

// ─── TELA DE BATALHA ─────────────────────────────────────────────────────────
export default function BattleScreen() {
    const [state,          setState]          = useState<BattleState>('LOADING');
    const [myTeam,         setMyTeam]         = useState<Pokemon[]>([]);
    const [oppTeam,        setOppTeam]        = useState<Pokemon[]>([]);
    const [playerFighter,  setPlayerFighter]  = useState<Pokemon | null>(null);
    const [oppFighter,     setOppFighter]     = useState<Pokemon | null>(null);
    const [chosenStat,     setChosenStat]     = useState('');
    const [playerWins,     setPlayerWins]     = useState(0);
    const [oppWins,        setOppWins]        = useState(0);
    const [logs,           setLogs]           = useState<string[]>([]);
    const [reward,         setReward]         = useState<Pokemon | null>(null);
    const [throwing,       setThrowing]       = useState(false);
    const [userId,         setUserId]         = useState<string | null>(null);

    // Anims
    const pulseAnim  = useRef(new Animated.Value(1)).current;
    const slideLeft  = useRef(new Animated.Value(-280)).current;
    const slideRight = useRef(new Animated.Value(280)).current;

    const addLog = (msg: string) => setLogs(prev => [msg, ...prev]);

    useEffect(() => {
        async function loadUserTeam() {
            try {
                const rawUser = await AsyncStorage.getItem('@pokemon_user');
                if (!rawUser) {
                    setState('IDLE');
                    return;
                }
                const user = JSON.parse(rawUser);
                setUserId(user.id);

                const teamData = await getTeam(user.id);
                
                if (teamData && teamData.team && teamData.team.length > 0) {
                    const detailedTeam = await Promise.all(
                        teamData.team.map((p: any) => fetchPokemon(p.name))
                    );
                    setMyTeam(detailedTeam.filter(Boolean) as Pokemon[]);
                }
            } catch (err) {
                console.log("Erro ao carregar time da batalha:", err);
            } finally {
                setState('IDLE');
            }
        }
        loadUserTeam();
    }, []);

    const startSearch = async () => {
        setState('SEARCHING');
        setPlayerWins(0); setOppWins(0); setLogs([]);

        const loop = Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.4, duration: 700, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
        ]));
        loop.start();

        setTimeout(async () => {
            loop.stop(); pulseAnim.setValue(1);
            const ids = Array.from({ length: 5 }, () => Math.floor(Math.random() * 151) + 1);
            const opp = (await Promise.all(ids.map(fetchPokemon))).filter(Boolean) as Pokemon[];
            setOppTeam(opp);
            setState('FOUND');
            setTimeout(() => {
                setState('BATTLING');
                playRound(0, 0, opp);
            }, 2800);
        }, 2000);
    };

    const updateGlobalStats = async (isVictory: boolean) => {
        if (!userId) return;
        try {
            const currentStats = await getStats(userId);
            const wins = parseInt(currentStats.vitorias || '0') + (isVictory ? 1 : 0);
            const losses = parseInt(currentStats.derrotas || '0') + (!isVictory ? 1 : 0);
            const currentLevel = currentStats.level || '1';

            await updateStats(userId, currentLevel, wins.toString(), losses.toString());
        } catch (err) {
            console.log("Erro ao salvar estatísticas globais:", err);
        }
    };

    const playRound = (pW: number, oW: number, currentOpp: Pokemon[]) => {
        if (pW >= 3) { handleWin(); return; }
        if (oW >= 3) { handleLoss(); return; }

        const pFight  = myTeam[Math.floor(Math.random() * myTeam.length)];
        const oFight  = currentOpp[Math.floor(Math.random() * currentOpp.length)];
        const stat    = DUEL_STATS[Math.floor(Math.random() * DUEL_STATS.length)];

        setPlayerFighter(pFight);
        setOppFighter(oFight);
        setChosenStat('');

        slideLeft.setValue(-280); slideRight.setValue(280);
        Animated.parallel([
            Animated.timing(slideLeft,  { toValue: 0, duration: 480, useNativeDriver: true }),
            Animated.timing(slideRight, { toValue: 0, duration: 480, useNativeDriver: true }),
        ]).start(() => {
            let draws = 0;
            const maxDraws = 14;
            const interval = setInterval(() => {
                draws++;
                if (draws >= maxDraws) {
                    clearInterval(interval);
                    setChosenStat(stat);

                    setTimeout(() => {
                        const pVal = pFight.poderes.find(p => p.nome === stat)?.forca ?? 0;
                        const oVal = oFight.poderes.find(p => p.nome === stat)?.forca ?? 0;

                        let newPW = pW, newOW = oW;
                        if (pVal >= oVal) {
                            addLog(`✅ ${pFight.nome} venceu! ${STAT_LABELS[stat] ?? stat} ${pVal} vs ${oVal}`);
                            newPW++;
                            setPlayerWins(newPW);
                        } else {
                            addLog(`❌ Rival venceu! ${STAT_LABELS[stat] ?? stat} ${oVal} vs ${pVal}`);
                            newOW++;
                            setOppWins(newOW);
                        }
                        setTimeout(() => playRound(newPW, newOW, currentOpp), 1600);
                    }, 600);
                } else {
                    setChosenStat(DUEL_STATS[draws % DUEL_STATS.length]);
                }
            }, 90);
        });
    };

    const handleLoss = () => {
        setState('LOSS');
        updateGlobalStats(false);
    };

    const handleWin = async () => {
        setState('REWARD');
        setThrowing(true);
        updateGlobalStats(true);

        const idRecompensa = Math.floor(Math.random() * 151) + 1;
        const pok = await fetchPokemon(idRecompensa);

        if (userId) {
            try {
                await addCaptured(userId, idRecompensa);
            } catch (err) {
                console.log("Erro ao salvar pokemon:", err);
            }
        }

        setTimeout(() => {
            setReward(pok);
            setThrowing(false);
        }, 1500);
    };

    if (state === 'LOADING') return (
        <View style={[s.screen, s.centered]}>
            <ActivityIndicator size="large" color="#EF5350" />
            <Text style={[s.searchSub, { marginTop: 12 }]}>Carregando arena...</Text>
        </View>
    );

    if (state === 'IDLE') return (
        <View style={s.screen}>
            <StatusBar barStyle="light-content" />
            <View style={s.bgLeft} /><View style={s.bgRight} />

            <View style={s.header}>
                <Link href="/dashboard" asChild>
                    <TouchableOpacity style={s.backBtn}><Text style={s.backText}>← Pokédex</Text></TouchableOpacity>
                </Link>
                <Text style={s.headerTitle}>BATALHA</Text>
                <View style={{ width: 60 }} />
            </View>

            <View style={s.idleContent}>
                <View style={s.vsCircle}>
                    <Text style={s.vsCircleText}>VS</Text>
                </View>

                <Text style={s.idleTitle}>Arena Pokémon</Text>
                <Text style={s.idleSub}>Duelo oficial de atributos (HP, ATK, DEF, SP.A, SP.D, VEL). Quem fechar 3 rounds primeiro vence e captura um novo Pokémon!</Text>

                {myTeam.length > 0 && (
                    <>
                        <Text style={s.sectionLabel}>SEUS 5 POKÉMON ESCALADOS</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
                            {myTeam.map(p => (
                                <View key={p.index} style={s.previewCard}>
                                    <Image source={{ uri: p.imagem }} style={s.previewImg} resizeMode="contain" />
                                    <Text style={s.previewName} numberOfLines={1}>{p.nome}</Text>
                                    <View style={[s.previewBadge, { backgroundColor: tc(p.tipos[0]) + '30' }]}>
                                        <Text style={[s.previewBadgeText, { color: tc(p.tipos[0]) }]}>{p.tipos[0]}</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </>
                )}

                <TouchableOpacity style={s.battleStartBtn} onPress={startSearch} activeOpacity={0.85}>
                    <MiniPokeball size={24} />
                    <Text style={s.battleStartText}>BUSCAR OPONENTE</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (state === 'SEARCHING') return (
        <View style={[s.screen, s.centered]}>
            <StatusBar barStyle="light-content" />
            <View style={s.bgLeft} /><View style={s.bgRight} />

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <View style={s.searchOrb}>
                    <Text style={s.searchOrbText}>?</Text>
                </View>
            </Animated.View>
            <Text style={s.searchTitle}>Procurando oponente...</Text>
            <Text style={s.searchSub}>Sorteando um rival com 5 Pokémon</Text>
        </View>
    );

    if (state === 'FOUND') return (
        <View style={[s.screen, s.centered]}>
            <StatusBar barStyle="light-content" />
            <View style={[s.bgLeft,  { backgroundColor: '#1a0505', opacity: 0.7 }]} />
            <View style={[s.bgRight, { backgroundColor: '#05051a', opacity: 0.7 }]} />

            <Text style={s.foundVS}>V  S</Text>

            <View style={s.foundRow}>
                <View style={s.foundCard}>
                    {myTeam[0] && <Image source={{ uri: myTeam[0].imagem }} style={s.foundImg} resizeMode="contain" />}
                    <Text style={[s.foundName, { color: '#EF5350' }]}>SEU TIME</Text>
                </View>

                <View style={s.foundDivider} />

                <View style={s.foundCard}>
                    {oppTeam[0] && <Image source={{ uri: oppTeam[0].imagem }} style={[s.foundImg, { transform: [{ scaleX: -1 }] }]} resizeMode="contain" />}
                    <Text style={[s.foundName, { color: '#4FC3F7' }]}>RIVAL</Text>
                </View>
            </View>

            <Text style={s.foundSub}>Sorteando atributos do 1º round...</Text>
        </View>
    );

    if (state === 'BATTLING' && playerFighter && oppFighter) return (
        <View style={s.screen}>
            <StatusBar barStyle="light-content" />
            <View style={[s.bgLeft,  { backgroundColor: tc(playerFighter.tipos[0]) + '12' }]} />
            <View style={[s.bgRight, { backgroundColor: tc(oppFighter.tipos[0])    + '12' }]} />

            <View style={s.header}>
                <TouchableOpacity onPress={() => setState('IDLE')} style={s.backBtn}>
                    <Text style={s.backText}>← Fugir</Text>
                </TouchableOpacity>
                <Text style={s.headerTitle}>ARENA</Text>
                <View style={{ width: 60 }} />
            </View>

            <View style={s.scoreboard}>
                <View style={s.scoreItem}>
                    <Text style={s.scoreLabel}>VOCÊ</Text>
                    <Text style={[s.scoreVal, { color: '#EF5350' }]}>{playerWins}</Text>
                </View>
                <View style={s.scoreDivider} />
                <Text style={s.scoreSep}>–</Text>
                <View style={s.scoreDivider} />
                <View style={s.scoreItem}>
                    <Text style={s.scoreLabel}>RIVAL</Text>
                    <Text style={[s.scoreVal, { color: '#4FC3F7' }]}>{oppWins}</Text>
                </View>
            </View>

            {chosenStat !== '' ? (
                <View style={s.statAnnounce}>
                    <Text style={s.statAnnounceLabel}>⚔️ ATRIBUTO SORTEADO</Text>
                    <Text style={s.statAnnounceVal}>{STAT_LABELS[chosenStat] ?? chosenStat}</Text>
                </View>
            ) : (
                <View style={s.statAnnounce}>
                    <Text style={s.statAnnounceLabel}>⚔️ EMBARALHANDO ATRIBUTOS...</Text>
                    <Text style={[s.statAnnounceVal, { color: '#3a5068' }]}>???</Text>
                </View>
            )}

            {/* A Arena agora é flex e não deixa a imagem vazar */}
            <View style={s.arenaRow}>
                <Animated.View style={{ flex: 1, transform: [{ translateX: slideLeft }] }}>
                    <FighterCard pokemon={playerFighter} side="player" chosenStat={chosenStat} />
                </Animated.View>
                <View style={s.arenaVS}>
                    <Text style={s.arenaVSText}>VS</Text>
                </View>
                <Animated.View style={{ flex: 1, transform: [{ translateX: slideRight }] }}>
                    <FighterCard pokemon={oppFighter} side="opponent" chosenStat={chosenStat} />
                </Animated.View>
            </View>

            {/* Footer Fixo: O log nunca será esmagado pelas imagens acima */}
            <View style={s.footerContainer}>
                <View style={{ marginBottom: 12 }}>
                    <BattleLog messages={logs} />
                </View>
                <View style={s.progressRow}>
                    {[0, 1, 2].map(i => (
                        <View key={i} style={[s.progressDot, i < playerWins && { backgroundColor: '#EF5350' }]} />
                    ))}
                    <View style={s.progressGap} />
                    {[0, 1, 2].map(i => (
                        <View key={i} style={[s.progressDot, i < oppWins && { backgroundColor: '#4FC3F7' }]} />
                    ))}
                </View>
            </View>
        </View>
    );

    if (state === 'LOSS') return (
        <View style={[s.screen, s.centered]}>
            <StatusBar barStyle="light-content" />
            <View style={[s.bgLeft,  { backgroundColor: '#1a0505' }]} />
            <View style={[s.bgRight, { backgroundColor: '#1a0505' }]} />

            <Text style={s.resultEmoji}>😵</Text>
            <Text style={[s.resultTitle, { color: '#EF5350' }]}>DERROTA!</Text>
            <Text style={s.resultSub}>O rival atingiu o score de 3 vitórias primeiro nesta rodada.</Text>

            <View style={s.resultBtns}>
                <TouchableOpacity style={s.btnPrimary} onPress={startSearch}>
                    <Text style={s.btnPrimaryText}>⚔️ Tentar Revanche</Text>
                </TouchableOpacity>
                <Link href="/dashboard" asChild>
                    <TouchableOpacity style={s.btnSecondary}>
                        <Text style={s.btnSecondaryText}>← Ir para Pokédex</Text>
                    </TouchableOpacity>
                </Link>
            </View>
        </View>
    );

    if (state === 'REWARD') return (
        <View style={[s.screen, s.centered]}>
            <StatusBar barStyle="light-content" />
            <View style={[s.bgLeft,  { backgroundColor: '#001a05' }]} />
            <View style={[s.bgRight, { backgroundColor: '#001a05' }]} />

            <Text style={s.resultEmoji}>🏆</Text>
            <Text style={[s.resultTitle, { color: '#66BB6A' }]}>VITÓRIA!</Text>

            {throwing ? (
                <>
                    <View style={s.rewardOrb}>
                        <MiniPokeball size={64} />
                    </View>
                    <Text style={s.resultSub}>Registrando captura no banco de dados...</Text>
                    <ThrowBall onEnd={() => {}} />
                </>
            ) : reward ? (
                <>
                    <Image source={{ uri: reward.imagem }} style={s.rewardImg} resizeMode="contain" />
                    <Text style={s.rewardName}>{reward.nome}</Text>
                    <View style={s.rewardBadge}>
                        <MiniPokeball size={16} />
                        <Text style={s.rewardBadgeText}>#{reward.index}  ·  {reward.tipos[0]}</Text>
                    </View>
                    <Text style={[s.resultSub, { marginTop: 4 }]}>Salvo com sucesso na sua coleção!</Text>
                </>
            ) : null}

            {!throwing && (
                <View style={s.resultBtns}>
                    <TouchableOpacity style={s.btnPrimary} onPress={startSearch}>
                        <Text style={s.btnPrimaryText}>⚔️ Próxima Arena</Text>
                    </TouchableOpacity>
                    <Link href="/dashboard" asChild>
                        <TouchableOpacity style={s.btnSecondary}>
                            <Text style={s.btnSecondaryText}>← Voltar à Pokédex</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            )}
        </View>
    );

    return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    screen:  { flex: 1, backgroundColor: '#050810' },
    centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050810' },
    bgLeft:  { position: 'absolute', top: 0, bottom: 0, left: 0,  width: '50%', backgroundColor: '#1a0505', opacity: 0.55 },
    bgRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%', backgroundColor: '#03050d', opacity: 0.55 },

    header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 8 },
    backBtn:     { padding: 8 },
    backText:    { color: '#e8f0fe', fontSize: 14, fontWeight: '700' },
    headerTitle: { color: '#e8f0fe', fontSize: 13, fontWeight: '900', letterSpacing: 3 },

    sectionLabel: { color: '#3a5068', fontSize: 9, fontWeight: '700', letterSpacing: 3, marginVertical: 12, paddingHorizontal: 20 },

    idleContent:    { flex: 1, alignItems: 'center', paddingTop: 20 },
    vsCircle:       { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#EF5350', alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: '#EF535018' },
    vsCircleText:   { color: '#EF5350', fontSize: 32, fontWeight: '900', letterSpacing: 4 },
    idleTitle:      { color: '#e8f0fe', fontSize: 24, fontWeight: '900', marginBottom: 10 },
    idleSub:        { color: '#3a5068', fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 28, marginBottom: 24 },
    previewCard:    { alignItems: 'center', backgroundColor: '#080d14', borderRadius: 12, borderWidth: 1, borderColor: '#0f1e2e', padding: 10, width: 82 },
    previewImg:     { width: 52, height: 52, marginBottom: 4 },
    previewName:    { color: '#e8f0fe', fontSize: 8, fontWeight: '700', textTransform: 'capitalize', textAlign: 'center', marginBottom: 4 },
    previewBadge:   { borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
    previewBadgeText:{ fontSize: 8, fontWeight: '700', textTransform: 'capitalize' },
    battleStartBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#EF5350', borderRadius: 14, paddingVertical: 15, paddingHorizontal: 32, marginTop: 28, shadowColor: '#EF5350', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 10 },
    battleStartText:{ color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },

    searchOrb:    { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EF535022', borderWidth: 2, borderColor: '#EF5350', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    searchOrbText:{ color: '#EF5350', fontSize: 40, fontWeight: '900' },
    searchTitle:  { color: '#e8f0fe', fontSize: 20, fontWeight: '800', marginBottom: 8 },
    searchSub:    { color: '#3a5068', fontSize: 13, textAlign: 'center' },

    foundVS:     { color: '#EF5350', fontSize: 52, fontWeight: '900', letterSpacing: 8, marginBottom: 32 },
    foundRow:    { flexDirection: 'row', alignItems: 'center', gap: 0 },
    foundCard:   { alignItems: 'center', width: 150 },
    foundImg:    { width: 110, height: 110 },
    foundName:   { fontSize: 13, fontWeight: '900', letterSpacing: 2, marginTop: 8 },
    foundDivider:{ width: 1, height: 80, backgroundColor: '#1a2235', marginHorizontal: 20 },
    foundSub:    { color: '#3a5068', fontSize: 13, marginTop: 32 },

    scoreboard:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#080d14', marginHorizontal: 16, borderRadius: 12, borderWidth: 0.5, borderColor: '#0f1e2e', paddingVertical: 12, marginBottom: 8 },
    scoreItem:   { alignItems: 'center', flex: 1 },
    scoreLabel:  { color: '#3a5068', fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 2 },
    scoreVal:    { fontSize: 26, fontWeight: '900' },
    scoreDivider:{ width: 1, height: 36, backgroundColor: '#0f1e2e' },
    scoreSep:    { color: '#1a2235', fontSize: 20, fontWeight: '800', marginHorizontal: 12 },

    statAnnounce:    { alignItems: 'center', backgroundColor: '#EF535012', borderWidth: 1, borderColor: '#EF535044', borderRadius: 10, marginHorizontal: 16, paddingVertical: 10, marginBottom: 10 },
    statAnnounceLabel:{ color: '#EF5350', fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 2 },
    statAnnounceVal: { color: '#e8f0fe', fontSize: 22, fontWeight: '900', letterSpacing: 3 },

    // Flex container da arena agora se molda dinamicamente, evitando sobreposições
    arenaRow:   { flex: 1, flexDirection: 'row', paddingHorizontal: 12, gap: 8, paddingTop: 6, marginBottom: 12 },
    arenaVS:    { alignItems: 'center', justifyContent: 'center', width: 28 },
    arenaVSText:{ color: '#1a2235', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

    // O rodapé onde as informações do log aparecem fixadas
    footerContainer: { paddingHorizontal: 16, paddingBottom: 16, flexShrink: 0 },
    progressRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
    progressDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#0f1820', borderWidth: 1, borderColor: '#1a2235' },
    progressGap: { width: 20 },

    resultEmoji: { fontSize: 64, marginBottom: 8 },
    resultTitle: { fontSize: 30, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
    resultSub:   { color: '#3a5068', fontSize: 14, textAlign: 'center', marginBottom: 28, paddingHorizontal: 24 },
    rewardImg:   { width: 140, height: 140, marginBottom: 8 },
    rewardName:  { color: '#e8f0fe', fontSize: 20, fontWeight: '900', textTransform: 'capitalize', marginBottom: 10 },
    rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#080d14', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 16 },
    rewardBadgeText:{ color: '#3a5068', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
    rewardOrb:   { marginBottom: 20 },

    resultBtns:       { gap: 12, alignItems: 'center' },
    btnPrimary:       { backgroundColor: '#EF5350', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
    btnPrimaryText:   { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
    btnSecondary:     { padding: 12 },
    btnSecondaryText: { color: '#3a5068', fontSize: 13, fontWeight: '700' },
});